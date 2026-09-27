import type { Request, RequestHandler } from "express";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";
import type { AdminApplication, AdminApplicationStatus, VerificationStatus } from "../../shared/admin-applications";

const allowedStatuses: AdminApplicationStatus[] = ["Under Review", "Approved", "Rejected"];
const allowedVerificationStatuses: VerificationStatus[] = ["Verified", "Not Verified"];
const applicationFields = ["firstName", "lastName", "email", "phone", "country", "timeZone", "interests", "hours", "experience", "reason", "eligibility"] as const;

const eligibilityLabels = [
  "I am at least 18 years old.",
  "I have reliable internet access.",
  "I can follow assignment instructions accurately.",
  "I agree to Contributor Program policies.",
  "I understand applications are reviewed before approval.",
];

type ApplicationInput = Record<string, unknown> & { applicationId?: unknown; submittedAt?: unknown };

type ApplicationRow = {
  id: string;
  submission_id: string;
  created_at: string;
  status: AdminApplicationStatus;
  verification_status: VerificationStatus;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  time_zone: string;
  assignment_categories: unknown;
  weekly_hours: string;
  previous_experience: string;
  motivation: string;
  age_18_plus: boolean;
  reliable_internet: boolean;
  follows_instructions: boolean;
  agrees_policies: boolean;
  understands_review: boolean;
};

async function getAdminUser(req: Request, res: Parameters<RequestHandler>[1]) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  if (data.user.app_metadata?.role !== "admin") {
    res.status(403).json({ error: "Administrator access required" });
    return null;
  }
  return data.user;
}

function serviceClient(res: Parameters<RequestHandler>[1]) {
  try {
    return createServiceRoleSupabaseClient();
  } catch {
    res.status(503).json({ error: "Admin application data is not configured." });
    return null;
  }
}

function rowEligibility(row: ApplicationRow): string[] {
  return [
    row.age_18_plus && eligibilityLabels[0],
    row.reliable_internet && eligibilityLabels[1],
    row.follows_instructions && eligibilityLabels[2],
    row.agrees_policies && eligibilityLabels[3],
    row.understands_review && eligibilityLabels[4],
  ].filter(Boolean) as string[];
}

function rowToApplication(row: ApplicationRow): AdminApplication {
  const details = {
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    timeZone: row.time_zone,
    interests: row.assignment_categories,
    hours: row.weekly_hours,
    experience: row.previous_experience,
    reason: row.motivation,
    eligibility: rowEligibility(row),
  };
  return {
    id: row.submission_id,
    applicantName: `${row.first_name} ${row.last_name}`.trim() || "Unnamed applicant",
    email: row.email,
    phone: row.phone,
    country: row.country,
    applicationDate: row.created_at,
    status: row.status,
    verificationStatus: row.verification_status,
    details,
  };
}

export const mirrorApplication: RequestHandler = async (req, res) => {
  const body = req.body as ApplicationInput;
  const applicationId = typeof body.applicationId === "string" && body.applicationId.trim() ? body.applicationId.trim() : crypto.randomUUID();
  const submittedAt = typeof body.submittedAt === "string" && !Number.isNaN(Date.parse(body.submittedAt)) ? body.submittedAt : new Date().toISOString();
  const values = Object.fromEntries(applicationFields.map((field) => [field, body[field]]));
  const eligibility = Array.isArray(values.eligibility) ? (values.eligibility as string[]) : [];

  const serviceSupabase = serviceClient(res);
  if (!serviceSupabase) return;
  const { error } = await serviceSupabase.from("applications").insert({
    submission_id: applicationId,
    created_at: submittedAt,
    status: "Under Review",
    verification_status: "Not Verified",
    first_name: values.firstName ?? "",
    last_name: values.lastName ?? "",
    email: values.email ?? "",
    phone: values.phone ?? "",
    country: values.country ?? "",
    time_zone: values.timeZone ?? "",
    assignment_categories: values.interests ?? [],
    weekly_hours: values.hours ?? "",
    previous_experience: values.experience ?? "",
    motivation: values.reason ?? "",
    age_18_plus: eligibility.includes(eligibilityLabels[0]),
    reliable_internet: eligibility.includes(eligibilityLabels[1]),
    follows_instructions: eligibility.includes(eligibilityLabels[2]),
    agrees_policies: eligibility.includes(eligibilityLabels[3]),
    understands_review: eligibility.includes(eligibilityLabels[4]),
  });

  if (error) {
    console.error("[applications] Insert failed for submission_id=%s:", applicationId, error.message, error.code, error.details);
    res.status(500).json({ error: "Unable to save the application." });
    return;
  }
  console.log("[applications] Inserted application submission_id=%s email=%s", applicationId, values.email ?? "");
  res.status(201).json({ id: applicationId });
};

const selectColumns = "id, submission_id, created_at, status, verification_status, first_name, last_name, email, phone, country, time_zone, assignment_categories, weekly_hours, previous_experience, motivation, age_18_plus, reliable_internet, follows_instructions, agrees_policies, understands_review";

async function listRows(req: Request, res: Parameters<RequestHandler>[1]) {
  const serviceSupabase = serviceClient(res);
  if (!serviceSupabase) return null;
  const { data, error } = await serviceSupabase.from("applications").select(selectColumns).order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: "Unable to load applications." });
    return null;
  }

  const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
  const status = typeof req.query.status === "string" ? req.query.status : "";
  return (data as ApplicationRow[]).map(rowToApplication).filter((application) =>
    (!search || application.applicantName.toLowerCase().includes(search) || application.email.toLowerCase().includes(search)) &&
    (!status || application.status === status),
  );
}

export const listAdminApplications: RequestHandler = async (req, res) => {
  if (!(await getAdminUser(req, res))) return;
  const applications = await listRows(req, res);
  if (!applications) return;
  res.json({ applications, total: applications.length });
};

export const getAdminApplicationDetails: RequestHandler = async (req, res) => {
  if (!(await getAdminUser(req, res))) return;
  const applications = await listRows(req, res);
  if (!applications) return;
  const application = applications.find((item) => item.id === req.params.id);
  if (!application) {
    res.status(404).json({ error: "Application not found." });
    return;
  }
  res.json(application);
};

export const updateAdminApplicationStatus: RequestHandler = async (req, res) => {
  if (!(await getAdminUser(req, res))) return;
  const serviceSupabase = serviceClient(res);
  if (!serviceSupabase) return;
  const status = req.body?.status as AdminApplicationStatus;
  if (!allowedStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid application status." });
    return;
  }
  const { error } = await serviceSupabase.from("applications").update({ status }).eq("submission_id", req.params.id);
  if (error) {
    res.status(500).json({ error: "Unable to update application status." });
    return;
  }
  res.json({ id: req.params.id, status });
};

export const updateAdminApplicationVerification: RequestHandler = async (req, res) => {
  if (!(await getAdminUser(req, res))) return;
  const serviceSupabase = serviceClient(res);
  if (!serviceSupabase) return;
  const verificationStatus = req.body?.verificationStatus as VerificationStatus;
  if (!allowedVerificationStatuses.includes(verificationStatus)) {
    res.status(400).json({ error: "Invalid verification status." });
    return;
  }
  const { error } = await serviceSupabase.from("applications").update({ verification_status: verificationStatus }).eq("submission_id", req.params.id);
  if (error) {
    res.status(500).json({ error: "Unable to update verification status." });
    return;
  }
  res.json({ id: req.params.id, verificationStatus });
};
