import { createServiceRoleSupabaseClient } from "./supabase";
import type { NotificationType } from "../../shared/notifications";

type NotifyParams = {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  relatedId?: string;
};

type NotifyUserParams = NotifyParams & { userId: string };

/**
 * Create a notification for a specific user.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function notifyUser(params: NotifyUserParams) {
  try {
    const serviceSupabase = createServiceRoleSupabaseClient();
    const { error } = await serviceSupabase.from("notifications").insert({
      user_id: params.userId,
      recipient_role: "user",
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link ?? null,
      related_id: params.relatedId ?? null,
      is_read: false,
    });
    if (error) {
      console.error("[notifyUser] Failed:", error.message, error.code);
    }
  } catch (err) {
    console.error("[notifyUser] Error:", err);
  }
}

/**
 * Create a notification for every admin user.
 * Fetches all admin users via the Supabase Admin API and inserts one row per admin.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function notifyAdmins(params: NotifyParams) {
  try {
    const serviceSupabase = createServiceRoleSupabaseClient();

    // Paginate through all users to find admins
    const adminIds: string[] = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await serviceSupabase.auth.admin.listUsers({
        page,
        perPage: 100,
      });
      if (error) {
        console.error("[notifyAdmins] Failed to list users:", error.message);
        return;
      }
      for (const u of data.users) {
        if (u.app_metadata?.role === "admin") {
          adminIds.push(u.id);
        }
      }
      hasMore = data.users.length === 100;
      page++;
    }

    if (adminIds.length === 0) return;

    const rows = adminIds.map((userId) => ({
      user_id: userId,
      recipient_role: "admin",
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link ?? null,
      related_id: params.relatedId ?? null,
      is_read: false,
    }));

    const { error: insertError } = await serviceSupabase
      .from("notifications")
      .insert(rows);
    if (insertError) {
      console.error("[notifyAdmins] Failed to insert:", insertError.message, insertError.code);
    }
  } catch (err) {
    console.error("[notifyAdmins] Error:", err);
  }
}
