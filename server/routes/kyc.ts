import type { RequestHandler } from "express";
import { z } from "zod";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";
import { notifyAdmins, notifyUser } from "../lib/notifications";

const identitySchema = z.object({
  fullName: z.string().trim().max(160).optional().default(""),
  dateOfBirth: z.string().max(40).optional().default(""),
  documentNumber: z.string().trim().max(100).optional().default(""),
  expiryDate: z.string().max(40).optional().default(""),
}).strict();
const acceptedTypeSchema = z.object({ id: z.string().min(1).max(50), label: z.string().trim().min(1).max(100), instructions: z.string().trim().max(500) }).strict();
const instructionsSchema = z.object({
  instructions: z.string().trim().min(1).max(5000),
  acceptedIdTypes: z.array(acceptedTypeSchema).min(1).max(20),
}).strict();
const draftSchema = z.object({
  consent: z.boolean().optional(),
  idType: z.string().max(50).optional(),
  idImagePath: z.string().max(500).nullable().optional(),
  selfieImagePath: z.string().max(500).nullable().optional(),
  identityInformation: identitySchema.optional(),
  qualityFlags: z.array(z.string().max(200)).max(20).optional(),
  confirmations: z.object({ idPhotoReadable: z.boolean(), selfieCentered: z.boolean() }).strict().optional(),
}).strict();

async function authorize(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], admin = false) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }
  const isAdmin = data.user.app_metadata?.role === "admin";
  if (admin && !isAdmin) {
    res.status(403).json({ error: "Administrator access required." });
    return null;
  }
  return { user: data.user, isAdmin };
}

function serviceClient(res: Parameters<RequestHandler>[1]) {
  try {
    return createServiceRoleSupabaseClient();
  } catch {
    res.status(503).json({ error: "KYC service is unavailable." });
    return null;
  }
}

async function hasApprovedDevice(service: ReturnType<typeof createServiceRoleSupabaseClient>, userId: string) {
  const { data, error } = await service.from("payment_requests").select("status").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data?.status === "Approved";
}

async function latestSubmission(service: ReturnType<typeof createServiceRoleSupabaseClient>, userId: string) {
  const { data, error } = await service.from("contributor_kyc_submissions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

async function signedFile(service: ReturnType<typeof createServiceRoleSupabaseClient>, path: string | null) {
  if (!path) return null;
  const { data, error } = await service.storage.from("contributor-kyc").createSignedUrl(path, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}

export const getKycInstructions: RequestHandler = async (req, res) => {
  const auth = await authorize(req, res);
  if (!auth) return;
  const service = serviceClient(res);
  if (!service) return;
  try {
    if (!(await hasApprovedDevice(service, auth.user.id))) {
      res.status(403).json({ error: "KYC becomes available after device approval." });
      return;
    }
  } catch {
    res.status(503).json({ error: "KYC instructions are unavailable." });
    return;
  }
  const { data, error } = await service.from("contributor_kyc_instructions").select("instructions, accepted_id_types, updated_at").eq("id", true).single();
  if (error || !data) {
    res.status(503).json({ error: "KYC instructions are unavailable." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ instructions: data.instructions, acceptedIdTypes: data.accepted_id_types, updatedAt: data.updated_at });
};

export const getMyKycStatus: RequestHandler = async (req, res) => {
  const auth = await authorize(req, res);
  if (!auth) return;
  const service = serviceClient(res);
  if (!service) return;
  try {
    if (!(await hasApprovedDevice(service, auth.user.id))) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ deviceApproved: false, status: null, rejectionReason: null });
      return;
    }
    const { data, error } = await service.from("contributor_kyc_submissions").select("status, rejection_reason").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    res.setHeader("Cache-Control", "no-store");
    res.json({ deviceApproved: true, status: data?.status ?? null, rejectionReason: data?.rejection_reason ?? null });
  } catch {
    res.status(503).json({ error: "KYC status is unavailable." });
  }
};

export const getMyKyc: RequestHandler = async (req, res) => {
  const auth = await authorize(req, res);
  if (!auth) return;
  const service = serviceClient(res);
  if (!service) return;
  try {
    const deviceApproved = await hasApprovedDevice(service, auth.user.id);
    if (!deviceApproved) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ deviceApproved: false, submission: null });
      return;
    }
    const submission = await latestSubmission(service, auth.user.id);
    if (submission) {
      submission.id_image_url = await signedFile(service, submission.id_image_path);
      submission.selfie_image_url = await signedFile(service, submission.selfie_image_path);
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ deviceApproved, submission });
  } catch {
    res.status(503).json({ error: "KYC status is unavailable." });
  }
};

export const createKycDraft: RequestHandler = async (req, res) => {
  const auth = await authorize(req, res);
  if (!auth) return;
  const service = serviceClient(res);
  if (!service) return;
  try {
    if (!(await hasApprovedDevice(service, auth.user.id))) {
      res.status(403).json({ error: "KYC becomes available after device approval." });
      return;
    }
    const current = await latestSubmission(service, auth.user.id);
    if (current?.status === "approved" || current?.status === "pending" || current?.status === "draft") {
      res.status(409).json({ error: "An active KYC submission already exists." });
      return;
    }
    const { data, error } = await service.from("contributor_kyc_submissions").insert({ user_id: auth.user.id }).select("id, status, created_at").single();
    if (error || !data) throw error;
    res.status(201).json({ submission: data });
  } catch {
    res.status(503).json({ error: "Unable to start KYC." });
  }
};

export const uploadKycFile: RequestHandler = async (req, res) => {
  const auth = await authorize(req, res);
  if (!auth) return;
  const { id, kind } = req.params;
  if (typeof id !== "string" || !z.string().uuid().safeParse(id).success || typeof kind !== "string" || !["id", "selfie"].includes(kind)) {
    res.status(400).json({ error: "Invalid KYC file request." });
    return;
  }
  const contentType = req.headers["content-type"];
  if (!contentType || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    res.status(415).json({ error: "Upload a JPEG, PNG, or WebP image." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  try {
    if (!(await hasApprovedDevice(service, auth.user.id))) {
      res.status(403).json({ error: "KYC becomes available after device approval." });
      return;
    }
    const { data: draft, error: draftError } = await service.from("contributor_kyc_submissions").select("id").eq("id", id).eq("user_id", auth.user.id).eq("status", "draft").maybeSingle();
    if (draftError || !draft) {
      res.status(404).json({ error: "KYC draft not found." });
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > 10 * 1024 * 1024) {
        res.status(413).json({ error: "Images must be 10 MB or smaller." });
        return;
      }
      chunks.push(buffer);
    }
    const file = Buffer.concat(chunks);
    const validHeader = contentType === "image/jpeg" ? file[0] === 0xff && file[1] === 0xd8
      : contentType === "image/png" ? file.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : file.subarray(0, 4).toString() === "RIFF" && file.subarray(8, 12).toString() === "WEBP";
    if (!validHeader || file.length < 1024) {
      res.status(400).json({ error: "The uploaded file is not a valid image." });
      return;
    }
    const path = `${auth.user.id}/${id}/${kind}-${crypto.randomUUID()}.${contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp"}`;
    const { error } = await service.storage.from("contributor-kyc").upload(path, file, { contentType, upsert: false });
    if (error) throw error;
    res.status(201).json({ path });
  } catch {
    res.status(500).json({ error: "Unable to securely store the image." });
  }
};

export const saveKycDraft: RequestHandler = async (req, res) => {
  const auth = await authorize(req, res);
  if (!auth) return;
  const submissionId = req.params.id;
  if (!z.string().uuid().safeParse(submissionId).success) {
    res.status(400).json({ error: "Invalid KYC submission." });
    return;
  }
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Check the information and try again." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  try {
    const { data: submission, error: readError } = await service.from("contributor_kyc_submissions").select("id, status, user_id").eq("id", submissionId).eq("user_id", auth.user.id).maybeSingle();
    if (readError || !submission) {
      res.status(404).json({ error: "KYC draft not found." });
      return;
    }
    if (submission.status !== "draft") {
      res.status(409).json({ error: "This submission can no longer be edited." });
      return;
    }
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const values = parsed.data;
    if (values.consent !== undefined) update.consent_at = values.consent ? new Date().toISOString() : null;
    if (values.idType !== undefined) update.id_type = values.idType;
    for (const [key, value] of [["idImagePath", values.idImagePath], ["selfieImagePath", values.selfieImagePath]] as const) {
      if (value !== undefined) {
        if (value !== null && !new RegExp(`^${auth.user.id}/${submissionId}/${key === "idImagePath" ? "id" : "selfie"}-[0-9a-f-]{36}\\.(jpg|png|webp)$`, "i").test(value)) {
          res.status(400).json({ error: "Invalid uploaded file reference." });
          return;
        }
        update[key === "idImagePath" ? "id_image_path" : "selfie_image_path"] = value;
      }
    }
    if (values.identityInformation) update.identity_information = values.identityInformation;
    if (values.qualityFlags) update.quality_flags = values.qualityFlags;
    if (values.confirmations) update.capture_confirmations = values.confirmations;
    const { error } = await service.from("contributor_kyc_submissions").update(update).eq("id", submissionId).eq("user_id", auth.user.id).eq("status", "draft");
    if (error) throw error;
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Unable to save KYC progress." });
  }
};

export const submitKyc: RequestHandler = async (req, res) => {
  const auth = await authorize(req, res);
  if (!auth) return;
  const submissionId = typeof req.body?.submissionId === "string" ? req.body.submissionId : "";
  if (!z.string().uuid().safeParse(submissionId).success) {
    res.status(400).json({ error: "Invalid KYC submission." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  try {
    if (!(await hasApprovedDevice(service, auth.user.id))) {
      res.status(403).json({ error: "KYC becomes available after device approval." });
      return;
    }
    const [{ data: submission, error: readError }, { data: settings, error: settingsError }] = await Promise.all([
      service.from("contributor_kyc_submissions").select("*").eq("id", submissionId).eq("user_id", auth.user.id).eq("status", "draft").maybeSingle(),
      service.from("contributor_kyc_instructions").select("accepted_id_types").eq("id", true).single(),
    ]);
    if (readError || settingsError || !submission || !settings) {
      res.status(409).json({ error: "KYC draft is unavailable. Refresh and try again." });
      return;
    }
    const accepted = settings.accepted_id_types as Array<{ id: string }>;
    const information = identitySchema.safeParse(submission.identity_information);
    const confirmations = submission.capture_confirmations as { idPhotoReadable?: boolean; selfieCentered?: boolean };
    const [idFile, selfieFile] = await Promise.all([
      service.storage.from("contributor-kyc").download(submission.id_image_path),
      service.storage.from("contributor-kyc").download(submission.selfie_image_path),
    ]);
    if (idFile.error || selfieFile.error || !idFile.data || !selfieFile.data) {
      res.status(400).json({ error: "A required image is missing. Re-upload the image and try again." });
      return;
    }
    const birthDate = information.success && /^\d{4}-\d{2}-\d{2}$/.test(information.data.dateOfBirth) ? new Date(`${information.data.dateOfBirth}T00:00:00.000Z`) : null;
    const validBirthDate = Boolean(birthDate && !Number.isNaN(birthDate.getTime()) && birthDate.toISOString().slice(0, 10) === information.data.dateOfBirth && birthDate.getTime() <= Date.now());
    if (!submission.consent_at || !accepted.some((entry) => entry.id === submission.id_type) || !submission.id_image_path || !submission.selfie_image_path || !confirmations.idPhotoReadable || !confirmations.selfieCentered || !information.success || !information.data.fullName || !validBirthDate || !information.data.documentNumber) {
      res.status(400).json({ error: "Complete consent, upload both images, select an accepted ID, and confirm all required information before submitting." });
      return;
    }
    const { data: updated, error } = await service.from("contributor_kyc_submissions").update({ status: "pending", submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", submissionId).eq("user_id", auth.user.id).eq("status", "draft").select("id").maybeSingle();
    if (error || !updated) throw error;
    await notifyAdmins({ type: "new_kyc_submission", title: "New KYC submission", message: "A contributor submitted identity documents for review.", link: "/admin/kyc", relatedId: updated.id });
    res.json({ status: "pending" });
  } catch {
    res.status(500).json({ error: "Unable to submit KYC." });
  }
};

export const listAdminKyc: RequestHandler = async (req, res) => {
  if (!(await authorize(req, res, true))) return;
  const service = serviceClient(res);
  if (!service) return;
  const status = typeof req.query.status === "string" && ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : undefined;
  const { data, error } = await service.from("contributor_kyc_submissions").select("id, user_id, status, id_type, submitted_at, reviewed_at, created_at").neq("status", "draft").order("submitted_at", { ascending: false });
  if (error) {
    res.status(503).json({ error: "KYC submissions are unavailable." });
    return;
  }
  const rows = (data ?? []).filter((row) => !status || row.status === status);
  const submissions = await Promise.all(rows.map(async (row) => {
    const { data: user } = await service.auth.admin.getUserById(row.user_id);
    const profile = user?.user.user_metadata ?? {};
    const displayName = typeof profile.full_name === "string" ? profile.full_name : typeof profile.name === "string" ? profile.name : "Contributor";
    return { ...row, contributor_name: displayName, contributor_email: user?.user.email ?? "" };
  }));
  const counts = (data ?? []).reduce((result, row) => {
    if (row.status === "pending") result.pending++;
    if (row.status === "approved") result.approved++;
    if (row.status === "rejected") result.rejected++;
    return result;
  }, { pending: 0, approved: 0, rejected: 0 });
  res.setHeader("Cache-Control", "no-store");
  res.json({ counts, submissions });
};

export const getAdminKyc: RequestHandler = async (req, res) => {
  if (!(await authorize(req, res, true))) return;
  const id = req.params.id;
  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: "Invalid KYC submission." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  const { data, error } = await service.from("contributor_kyc_submissions").select("*").eq("id", id).maybeSingle();
  if (error || !data || data.status === "draft") {
    res.status(404).json({ error: "KYC submission not found." });
    return;
  }
  try {
    const [{ data: user }, idImageUrl, selfieImageUrl] = await Promise.all([
      service.auth.admin.getUserById(data.user_id),
      signedFile(service, data.id_image_path),
      signedFile(service, data.selfie_image_path),
    ]);
    res.setHeader("Cache-Control", "no-store");
    res.json({ submission: { ...data, contributor_email: user?.user.email ?? "", id_image_url: idImageUrl, selfie_image_url: selfieImageUrl } });
  } catch {
    res.status(503).json({ error: "KYC review material is unavailable." });
  }
};

export const reviewKyc: RequestHandler = async (req, res) => {
  const auth = await authorize(req, res, true);
  if (!auth) return;
  const parsed = z.object({ status: z.enum(["approved", "rejected"]), rejectionReason: z.string().trim().max(2000).optional() }).strict().safeParse(req.body);
  if (!parsed.success || (parsed.data.status === "rejected" && !parsed.data.rejectionReason)) {
    res.status(400).json({ error: "A rejection reason is required." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  const { data: current, error: readError } = await service.from("contributor_kyc_submissions").select("id, user_id, status").eq("id", req.params.id).maybeSingle();
  if (readError || !current || current.status !== "pending") {
    res.status(404).json({ error: "Pending KYC submission not found." });
    return;
  }
  const { data: updated, error } = await service.from("contributor_kyc_submissions").update({
    status: parsed.data.status,
    rejection_reason: parsed.data.status === "rejected" ? parsed.data.rejectionReason : null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: auth.user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", current.id).eq("status", "pending").select("id").maybeSingle();
  if (error || !updated) {
    res.status(409).json({ error: "This KYC submission has already been reviewed." });
    return;
  }
  const approved = parsed.data.status === "approved";
  await notifyUser({
    userId: current.user_id,
    type: approved ? "kyc_approved" : "kyc_rejected",
    title: approved ? "KYC approved" : "KYC needs changes",
    message: approved ? "Your identity documents have been approved." : `Your KYC submission was rejected: ${parsed.data.rejectionReason}`,
    link: "/dashboard",
    relatedId: current.id,
  });
  res.json({ status: parsed.data.status });
};

export const getAdminKycInstructions: RequestHandler = async (req, res) => {
  if (!(await authorize(req, res, true))) return;
  const service = serviceClient(res);
  if (!service) return;
  const { data, error } = await service.from("contributor_kyc_instructions").select("instructions, accepted_id_types, updated_at").eq("id", true).single();
  if (error || !data) {
    res.status(503).json({ error: "KYC instructions are unavailable." });
    return;
  }
  res.json({ instructions: data.instructions, acceptedIdTypes: data.accepted_id_types, updatedAt: data.updated_at });
};

export const saveAdminKycInstructions: RequestHandler = async (req, res) => {
  const auth = await authorize(req, res, true);
  if (!auth) return;
  const parsed = instructionsSchema.safeParse(req.body);
  if (!parsed.success || new Set(parsed.data.acceptedIdTypes.map((type) => type.id)).size !== parsed.data.acceptedIdTypes.length) {
    res.status(400).json({ error: "Provide valid instructions and unique accepted ID types." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  const { error } = await service.from("contributor_kyc_instructions").upsert({ id: true, instructions: parsed.data.instructions, accepted_id_types: parsed.data.acceptedIdTypes, updated_at: new Date().toISOString(), updated_by: auth.user.id });
  if (error) {
    res.status(500).json({ error: "Unable to save KYC instructions." });
    return;
  }
  res.json({ success: true });
};
