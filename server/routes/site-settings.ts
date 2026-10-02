import type { Request, RequestHandler } from "express";
import { z } from "zod";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";
import { sanitizeEmailHtml } from "../lib/email-templates";

const templateKeys = [
  "new_application",
  "application_status_changed",
  "device_request_received",
  "device_approved",
  "device_rejected",
  "new_message",
  "withdrawal_status",
  "interview_status",
  "admin_notification",
] as const;

const seoSchema = z.object({
  siteTitle: z.string().trim().min(1).max(120),
  metaDescription: z.string().trim().max(320),
  defaultKeywords: z.string().trim().max(500),
  ogTitle: z.string().trim().max(120),
  ogDescription: z.string().trim().max(320),
  ogImage: z.string().trim().max(2048).refine((value) => !value || isHttpUrl(value), "Use an HTTP or HTTPS image URL."),
  twitterTitle: z.string().trim().max(120),
  twitterDescription: z.string().trim().max(320),
  canonicalUrl: z.string().trim().max(2048).refine((value) => !value || isRootUrl(value), "Use the production site root URL without a path, query, or fragment."),
  allowIndexing: z.boolean(),
}).strict();

const siteSchema = z.object({
  siteName: z.string().trim().min(1).max(120),
  siteDescription: z.string().trim().max(500),
  supportEmail: z.string().trim().max(254).refine((value) => !value || z.email().safeParse(value).success, "Enter a valid support email."),
  contactInformation: z.string().trim().max(1000),
  defaultNotificationPreferences: z.object({ emailEnabled: z.boolean(), inAppEnabled: z.boolean() }).strict(),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().trim().min(1).max(500),
}).strict();

const templateSchema = z.object({
  key: z.enum(templateKeys),
  label: z.string().trim().min(1).max(100),
  subject: z.string().trim().max(200).refine((value) => !/[\r\n]/.test(value), "Subject cannot contain line breaks."),
  body: z.string().max(10000),
  html: z.string().max(20000),
  enabled: z.boolean(),
}).strict();

const templatesSchema = z.array(templateSchema).length(templateKeys.length).superRefine((templates, context) => {
  if (new Set(templates.map((template) => template.key)).size !== templateKeys.length) {
    context.addIssue({ code: "custom", message: "All email templates must be present exactly once." });
  }
});

function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isRootUrl(value: string) {
  if (!isHttpUrl(value)) return false;
  const url = new URL(value);
  return url.pathname === "/" && !url.search && !url.hash;
}

async function authorizeAdmin(req: Request, res: Parameters<RequestHandler>[1]) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  if (data.user.app_metadata?.role !== "admin") {
    res.status(403).json({ error: "Administrator access required" });
    return false;
  }
  return true;
}

function databaseClient(res: Parameters<RequestHandler>[1]) {
  try {
    return createServiceRoleSupabaseClient();
  } catch {
    res.status(503).json({ error: "Site settings are not configured on the server." });
    return null;
  }
}

export const getPublicSiteSettings: RequestHandler = async (_req, res) => {
  const service = databaseClient(res);
  if (!service) return;
  const { data, error } = await service.from("site_admin_settings").select("seo, site").eq("id", true).maybeSingle();
  if (error || !data) {
    res.status(503).json({ error: "Site settings are unavailable." });
    return;
  }
  const site = data.site as Record<string, unknown>;
  res.setHeader("Cache-Control", "no-store");
  res.json({
    seo: data.seo,
    site: {
      siteName: site.siteName,
      siteDescription: site.siteDescription,
      supportEmail: site.supportEmail,
      contactInformation: site.contactInformation,
      maintenanceMode: site.maintenanceMode,
      maintenanceMessage: site.maintenanceMessage,
    },
  });
};

export const getAdminSiteSettings: RequestHandler = async (req, res) => {
  if (!(await authorizeAdmin(req, res))) return;
  const service = databaseClient(res);
  if (!service) return;
  const [settingsResult, templatesResult] = await Promise.all([
    service.from("site_admin_settings").select("seo, site").eq("id", true).maybeSingle(),
    service.from("site_email_templates").select("key, label, subject, body, html, enabled").order("key"),
  ]);
  if (settingsResult.error || !settingsResult.data || templatesResult.error || !templatesResult.data) {
    res.status(503).json({ error: "Site settings are unavailable. Apply the site admin settings migration and try again." });
    return;
  }
  res.json({ seo: settingsResult.data.seo, site: settingsResult.data.site, templates: templatesResult.data });
};

export const updateAdminSiteSettings: RequestHandler = async (req, res) => {
  if (!(await authorizeAdmin(req, res))) return;
  const section = req.params.section;
  const schema = section === "seo" ? seoSchema : section === "site" ? siteSchema : section === "templates" ? templatesSchema : null;
  if (!schema) {
    res.status(404).json({ error: "Unknown settings section." });
    return;
  }
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." });
    return;
  }

  const service = databaseClient(res);
  if (!service) return;
  const now = new Date().toISOString();
  let result;
  if (section === "templates") {
    result = await service.from("site_email_templates").upsert((parsed.data as z.infer<typeof templatesSchema>).map((template) => ({
      ...template,
      html: sanitizeEmailHtml(template.html),
      updated_at: now,
    })), { onConflict: "key" });
  } else if (section === "seo") {
    result = await service.from("site_admin_settings").update({ seo: parsed.data as z.infer<typeof seoSchema>, updated_at: now }).eq("id", true);
  } else {
    result = await service.from("site_admin_settings").update({ site: parsed.data as z.infer<typeof siteSchema>, updated_at: now }).eq("id", true);
  }
  if (result.error) {
    console.error("[api] Failed to save site settings", result.error);
    res.status(500).json({ error: "Unable to save site settings." });
    return;
  }
  res.json({ success: true });
};
