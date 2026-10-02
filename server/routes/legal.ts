import { z } from "zod";
import type { RequestHandler } from "express";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";

const policyKeys = ["terms", "privacy", "cookies", "contributor-agreement"] as const;
const policySchema = z.object({
  id: z.string().uuid().optional(),
  key: z.enum(policyKeys),
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(50000),
  version: z.number().int().positive(),
  effectiveDate: z.string().date(),
  isPublished: z.boolean(),
  acknowledgementRequired: z.boolean(),
}).strict();

async function authorize(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], admin = false) {
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
  if (admin && data.user.app_metadata?.role !== "admin") {
    res.status(403).json({ error: "Administrator access required" });
    return null;
  }
  return data.user;
}

function serviceClient(res: Parameters<RequestHandler>[1]) {
  try {
    return createServiceRoleSupabaseClient();
  } catch {
    res.status(503).json({ error: "Legal data is unavailable." });
    return null;
  }
}

export const listPublicPolicies: RequestHandler = async (_req, res) => {
  const service = serviceClient(res);
  if (!service) return;
  const { data, error } = await service.from("legal_policies")
    .select("id, policy_key, title, content, version, effective_date, acknowledgement_required, created_at")
    .eq("is_published", true).order("version", { ascending: false });
  if (error) {
    console.error("[api] Unable to load published policies.", error);
    res.status(503).json({ error: "Published policies are unavailable." });
    return;
  }
  const latest = new Map<string, typeof data[number]>();
  for (const policy of data ?? []) if (!latest.has(policy.policy_key)) latest.set(policy.policy_key, policy);
  res.setHeader("Cache-Control", "no-store");
  res.json({ policies: [...latest.values()] });
};

export const listAdminPolicies: RequestHandler = async (req, res) => {
  if (!(await authorize(req, res, true))) return;
  const service = serviceClient(res);
  if (!service) return;
  const { data, error } = await service.from("legal_policies")
    .select("id, policy_key, title, content, version, effective_date, is_published, acknowledgement_required, created_at")
    .order("policy_key").order("version", { ascending: false });
  if (error) {
    console.error("[api] Unable to load legal policies.", error);
    res.status(503).json({ error: "Legal policies are unavailable." });
    return;
  }
  res.json({ policies: data ?? [] });
};

export const saveAdminPolicy: RequestHandler = async (req, res) => {
  const admin = await authorize(req, res, true);
  if (!admin) return;
  const parsed = policySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid policy." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  const policy = parsed.data;
  if (policy.id) {
    const { data: current, error: currentError } = await service.from("legal_policies").select("id, is_published, policy_key, version").eq("id", policy.id).maybeSingle();
    if (currentError || !current) {
      res.status(404).json({ error: "Policy version not found." });
      return;
    }
    if (current.is_published) {
      res.status(409).json({ error: "Published versions cannot be edited. Create a new version instead." });
      return;
    }
    if (policy.key !== current.policy_key || policy.version !== current.version) {
      res.status(400).json({ error: "A draft policy's type and version cannot be changed." });
      return;
    }
    const { error } = await service.from("legal_policies").update({
      title: policy.title,
      content: policy.content,
      effective_date: policy.effectiveDate,
      is_published: policy.isPublished,
      acknowledgement_required: policy.acknowledgementRequired,
    }).eq("id", policy.id);
    if (error) {
      console.error("[api] Unable to update legal policy.", error);
      res.status(500).json({ error: "Unable to save policy." });
      return;
    }
    res.json({ success: true });
    return;
  }

  const { data: prior, error: priorError } = await service.from("legal_policies").select("version").eq("policy_key", policy.key).order("version", { ascending: false }).limit(1);
  if (priorError) {
    res.status(500).json({ error: "Unable to verify policy version." });
    return;
  }
  if (policy.version !== (prior?.[0]?.version ?? 0) + 1) {
    res.status(409).json({ error: "Create the next sequential version for this policy." });
    return;
  }
  const { error } = await service.from("legal_policies").insert({
    policy_key: policy.key,
    title: policy.title,
    content: policy.content,
    version: policy.version,
    effective_date: policy.effectiveDate,
    is_published: policy.isPublished,
    acknowledgement_required: policy.acknowledgementRequired,
    created_by: admin.id,
  });
  if (error) {
    console.error("[api] Unable to create legal policy version.", error);
    res.status(500).json({ error: "Unable to create policy version." });
    return;
  }
  res.status(201).json({ success: true });
};

export const listMyPolicyAcknowledgements: RequestHandler = async (req, res) => {
  const user = await authorize(req, res);
  if (!user) return;
  const service = serviceClient(res);
  if (!service) return;
  const [{ data: policies, error: policiesError }, { data: acknowledgements, error: ackError }] = await Promise.all([
    service.from("legal_policies").select("id, policy_key, title, content, version, effective_date, acknowledgement_required").eq("is_published", true).eq("acknowledgement_required", true).order("version", { ascending: false }),
    service.from("legal_policy_acknowledgements").select("policy_id, acknowledged_at").eq("user_id", user.id),
  ]);
  if (policiesError || ackError) {
    console.error("[api] Unable to load policy acknowledgements.", policiesError ?? ackError);
    res.status(503).json({ error: "Policy acknowledgement status is unavailable." });
    return;
  }
  const latest = new Map<string, typeof policies[number]>();
  for (const policy of policies ?? []) if (!latest.has(policy.policy_key)) latest.set(policy.policy_key, policy);
  res.json({
    policies: [...latest.values()],
    acknowledgements: acknowledgements ?? [],
  });
};

export const acknowledgePolicy: RequestHandler = async (req, res) => {
  const user = await authorize(req, res);
  if (!user) return;
  const policyId = typeof req.body?.policyId === "string" ? req.body.policyId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(policyId)) {
    res.status(400).json({ error: "A valid policy version is required." });
    return;
  }
  const service = serviceClient(res);
  if (!service) return;
  const { data: policy, error: policyError } = await service.from("legal_policies").select("id").eq("id", policyId).eq("is_published", true).eq("acknowledgement_required", true).maybeSingle();
  if (policyError || !policy) {
    res.status(404).json({ error: "Required published policy not found." });
    return;
  }
  const { error } = await service.from("legal_policy_acknowledgements").insert({ user_id: user.id, policy_id: policy.id });
  if (error?.code === "23505") {
    res.status(409).json({ error: "This policy version has already been acknowledged." });
    return;
  }
  if (error) {
    console.error("[api] Unable to save policy acknowledgement.", error);
    res.status(500).json({ error: "Unable to save acknowledgement." });
    return;
  }
  res.status(201).json({ success: true });
};
