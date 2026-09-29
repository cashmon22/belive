import type { RequestHandler } from "express";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";

export const getAdminDashboardStats: RequestHandler = async (req, res) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (userData.user.app_metadata?.role !== "admin") {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  let service;
  try {
    service = createServiceRoleSupabaseClient();
  } catch (error) {
    console.error("[api] Dashboard stats not configured", error);
    res.status(503).json({ error: "Dashboard statistics are not configured on the server." });
    return;
  }

  const [applications, deviceRequests, devices] = await Promise.all([
    service.from("applications").select("id", { count: "exact", head: true }),
    service.from("payment_requests").select("id", { count: "exact", head: true }),
    service.from("devices").select("id", { count: "exact", head: true }).eq("status", "Available"),
  ]);
  const failed = applications.error ?? deviceRequests.error ?? devices.error;
  if (failed) {
    console.error("[api] Unable to load dashboard statistics.", failed);
    res.status(500).json({ error: "Unable to load dashboard statistics." });
    return;
  }

  let users = 0;
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[api] Unable to count users.", error);
      res.status(500).json({ error: "Unable to load dashboard statistics." });
      return;
    }
    users += data.users.length;
    if (data.users.length < perPage) break;
  }

  res.json({
    users,
    applications: applications.count ?? 0,
    deviceRequests: deviceRequests.count ?? 0,
    availableDevices: devices.count ?? 0,
  });
};
