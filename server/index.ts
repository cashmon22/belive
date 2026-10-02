import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleProgramStatus } from "./routes/program";
import { getAdminDashboardStats } from "./routes/admin-dashboard";
import {
  createPaymentRequest,
  deletePaymentRequest,
  listPaymentRequests,
  updatePaymentRequestStatus,
} from "./routes/payment-requests";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUserDetails,
  getAdminContributorOverview,
  listAdminUsers,
  updateAdminUserStatus,
} from "./routes/admin-users";
import {
  deleteAdminApplication,
  getAdminApplicationDetails,
  listAdminApplications,
  mirrorApplication,
  getMyApplication,
  updateAdminApplicationStatus,
  updateAdminApplicationVerification,
} from "./routes/admin-applications";
import {
  addUserBalance,
  getUserBalance,
  listBalanceTransactions,
  removeUserBalance,
} from "./routes/admin-balance";
import {
  adminCreateSupportConversation,
  createOrGetConversation,
  deleteAdminConversation,
  getConversation,
  getOrCreateSupportConversation,
  listConversations,
  markConversationRead,
  sendMessage,
} from "./routes/vendor-messages";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./routes/notifications";
import { listContributorTasks, startContributorTask } from "./routes/contributor-tasks";
import { getAdminSiteSettings, getPublicSiteSettings, updateAdminSiteSettings } from "./routes/site-settings";
import { createServiceRoleSupabaseClient } from "./lib/supabase";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/program/status", handleProgramStatus);
  app.get("/api/site/settings", getPublicSiteSettings);
  app.get("/api/admin/site-settings", getAdminSiteSettings);
  app.put("/api/admin/site-settings/:section", updateAdminSiteSettings);
  app.get("/robots.txt", async (req, res) => {
    try {
      const service = createServiceRoleSupabaseClient();
      const { data, error } = await service.from("site_admin_settings").select("seo, site").eq("id", true).maybeSingle();
      if (error || !data) throw new Error("Settings unavailable");
      const origin = sitemapOrigin(req, data.seo as Record<string, unknown>);
      const site = data.site as Record<string, unknown>;
      const robots = site.maintenanceMode === true || data.seo.allowIndexing !== true
        ? "User-agent: *\nDisallow: /\n"
        : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /trusted-vendor\nDisallow: /login\nSitemap: ${origin}/sitemap.xml\n`;
      res.type("text/plain").send(robots);
    } catch {
      res.status(503).type("text/plain").send("User-agent: *\nDisallow: /\n");
    }
  });
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const service = createServiceRoleSupabaseClient();
      const { data, error } = await service.from("site_admin_settings").select("seo, site").eq("id", true).maybeSingle();
      if (error || !data) throw new Error("Settings unavailable");
      const seo = data.seo as Record<string, unknown>;
      const site = data.site as Record<string, unknown>;
      if (site.maintenanceMode === true || seo.allowIndexing !== true) {
        res.status(404).type("application/xml").send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
        return;
      }
      const origin = sitemapOrigin(req, seo);
      const paths = ["/", "/how-it-works", "/payments", "/success-stories", "/faq", "/contact", "/apply"];
      const urls = paths.map((path) => `<url><loc>${xmlEscape(new URL(path, origin).toString())}</loc></url>`).join("");
      res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
    } catch {
      res.status(503).type("application/xml").send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
  });
  app.post("/api/payment-requests", createPaymentRequest);
  app.get("/api/payment-requests", listPaymentRequests);
  app.patch(
    "/api/admin/payment-requests/:id/status",
    updatePaymentRequestStatus,
  );
  app.delete("/api/admin/payment-requests/:id", deletePaymentRequest);
  app.get("/api/admin/dashboard-stats", getAdminDashboardStats);
  app.get("/api/admin/users", listAdminUsers);
  app.post("/api/admin/users", createAdminUser);
  app.get("/api/admin/users/:id/overview", getAdminContributorOverview);
  app.get("/api/admin/users/:id", getAdminUserDetails);
  app.patch("/api/admin/users/:id/status", updateAdminUserStatus);
  app.delete("/api/admin/users/:id", deleteAdminUser);
  app.get("/api/admin/users/:id/balance", getUserBalance);
  app.post("/api/admin/users/:id/balance/add", addUserBalance);
  app.post("/api/admin/users/:id/balance/remove", removeUserBalance);
  app.get("/api/admin/users/:id/balance/transactions", listBalanceTransactions);
  app.post("/api/applications/mirror", mirrorApplication);
  app.get("/api/applications/me", getMyApplication);
  app.get("/api/admin/applications", listAdminApplications);
  app.get("/api/admin/applications/:id", getAdminApplicationDetails);
  app.patch("/api/admin/applications/:id/status", updateAdminApplicationStatus);
  app.delete("/api/admin/applications/:id", deleteAdminApplication);
  app.patch("/api/admin/applications/:id/verification", updateAdminApplicationVerification);

  // Vendor + Support messaging
  app.post("/api/vendor-conversations", createOrGetConversation);
  app.get("/api/vendor-conversations", listConversations);
  app.get("/api/vendor-conversations/support", getOrCreateSupportConversation);
  app.get("/api/vendor-conversations/:id", getConversation);
  app.delete("/api/admin/vendor-conversations/:id", deleteAdminConversation);
  app.post("/api/vendor-conversations/:id/messages", sendMessage);
  app.patch("/api/vendor-conversations/:id/read", markConversationRead);
  app.post("/api/admin/support-conversations", adminCreateSupportConversation);

  // Notifications
  app.get("/api/notifications", listNotifications);
  app.patch("/api/notifications/:id/read", markNotificationRead);
  app.patch("/api/notifications/read-all", markAllNotificationsRead);
  app.get("/api/contributor/tasks", listContributorTasks);
  app.post("/api/contributor/tasks", startContributorTask);

  return app;
}

function sitemapOrigin(req: import("express").Request, seo: Record<string, unknown>) {
  const configured = (typeof seo.canonicalUrl === "string" ? seo.canonicalUrl : "") || process.env.SITE_URL;
  if (configured) {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid site origin");
    return url.origin;
  }
  const host = req.get("host");
  if (!host || !/^(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::\d{1,5})?$/i.test(host)) throw new Error("Invalid request host");
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = req.secure || forwardedProtocol === "https" ? "https" : "http";
  return new URL(`${protocol}://${host}`).origin;
}

function xmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}
