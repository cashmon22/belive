import type { Request, RequestHandler } from "express";
import { createAuthenticatedSupabaseClient, supabase } from "../lib/supabase";

async function getAuthenticatedUser(req: Request, res: Parameters<RequestHandler>[1]) {
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
  return {
    user: data.user,
    supabase: createAuthenticatedSupabaseClient(token),
  };
}

const selectColumns =
  "id, user_id, recipient_role, type, title, message, link, related_id, is_read, created_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotification(row: any) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    recipientRole: row.recipient_role as string,
    type: row.type as string,
    title: row.title as string,
    message: row.message as string,
    link: (row.link as string | null) ?? null,
    relatedId: (row.related_id as string | null) ?? null,
    isRead: (row.is_read as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

// GET /api/notifications — list current user's notifications (newest first)
export const listNotifications: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { supabase: authSupabase } = context;

  const { data, error } = await authSupabase
    .from("notifications")
    .select(selectColumns)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[listNotifications] Failed:", error.message, error.code);
    console.error("[api] Unable to load notifications.", error);
    res.status(500).json({ error: "Unable to load notifications." });
    return;
  }

  res.json((data ?? []).map(mapNotification));
};

// PATCH /api/notifications/:id/read — mark a single notification as read
export const markNotificationRead: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { supabase: authSupabase } = context;

  const { error } = await authSupabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", req.params.id)
    .eq("user_id", context.user.id);

  if (error) {
    console.error("[markNotificationRead] Failed:", error.message, error.code);
    console.error("[api] Unable to mark notification.", error);
    res.status(500).json({ error: "Unable to mark notification." });
    return;
  }

  res.json({ success: true });
};

// PATCH /api/notifications/read-all — mark all unread notifications as read
export const markAllNotificationsRead: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { supabase: authSupabase } = context;

  const { error } = await authSupabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", context.user.id)
    .eq("is_read", false);

  if (error) {
    console.error("[markAllNotificationsRead] Failed:", error.message, error.code);
    console.error("[api] Unable to mark notifications.", error);
    res.status(500).json({ error: "Unable to mark notifications." });
    return;
  }

  res.json({ success: true });
};
