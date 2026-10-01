import type { Request, RequestHandler } from "express";
import type { User } from "@supabase/supabase-js";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";
import { deleteOptionalRows, isMissingOptionalSchemaObject } from "../lib/admin-deletions";
import { notifyUser } from "../lib/notifications";
import type { AdminUser, AdminUserStatus } from "../../shared/admin-users";

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

function toAdminUser(user: User): AdminUser {
  const name = typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim()
    : user.email?.split("@")[0] || "Unnamed user";
  const isSuspended = Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now());

  return {
    id: user.id,
    name,
    email: user.email ?? "",
    createdAt: user.created_at,
    status: isSuspended ? "Suspended" : "Active",
    lastSignInAt: user.last_sign_in_at ?? null,
    isAdmin: user.app_metadata?.role === "admin",
  };
}

function getServiceRoleClient(res: Parameters<RequestHandler>[1]) {
  try {
    return createServiceRoleSupabaseClient();
  } catch {
    res.status(503).json({ error: "Admin user data is not configured." });
    return null;
  }
}

export const listAdminUsers: RequestHandler = async (req, res) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  const serviceSupabase = getServiceRoleClient(res);
  if (!serviceSupabase) return;

  const { data, error } = await serviceSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error("[api] Unable to load users.", error);
    res.status(500).json({ error: "Unable to load users." });
    return;
  }

  const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
  const users = data.users
    .map(toAdminUser)
    .filter((user) => !search || user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search));

  res.json({ users, total: users.length });
};

export const getAdminUserDetails: RequestHandler = async (req, res) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  const serviceSupabase = getServiceRoleClient(res);
  if (!serviceSupabase) return;
  const userId = typeof req.params.id === "string" ? req.params.id : "";
  if (!userId) {
    res.status(400).json({ error: "A user id is required." });
    return;
  }

  const { data, error } = await serviceSupabase.auth.admin.getUserById(userId);
  if (error || !data.user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.json(toAdminUser(data.user));
};

export const deleteAdminUser: RequestHandler = async (req, res) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  const serviceSupabase = getServiceRoleClient(res);
  if (!serviceSupabase) return;
  const userId = typeof req.params.id === "string" ? req.params.id : "";
  if (!userId) {
    res.status(400).json({ error: "A user id is required." });
    return;
  }

  try {
    const { data, error } = await serviceSupabase.auth.admin.getUserById(userId);
    if (error || !data.user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    if (data.user.app_metadata?.role === "admin") {
      res.status(403).json({ error: "Administrator accounts cannot be deleted." });
      return;
    }

    const { data: conversations, error: conversationsError } = await serviceSupabase
      .from("vendor_conversations")
      .select("id")
      .eq("user_id", userId);
    if (conversationsError && !isMissingOptionalSchemaObject(conversationsError)) throw conversationsError;

    const conversationIds = (conversations ?? []).map((conversation) => conversation.id as string);
    if (conversationIds.length) {
      await deleteOptionalRows(() => serviceSupabase.from("vendor_messages").delete().in("conversation_id", conversationIds));
    }
    await deleteOptionalRows(() => serviceSupabase.from("vendor_messages").delete().eq("sender_id", userId));
    await deleteOptionalRows(() => serviceSupabase.from("vendor_conversations").delete().eq("user_id", userId));
    await deleteOptionalRows(() => serviceSupabase.from("payment_requests").delete().eq("user_id", userId));
    await deleteOptionalRows(() => serviceSupabase.from("notifications").delete().eq("user_id", userId));
    await deleteOptionalRows(() => serviceSupabase.from("contributor_earnings").delete().eq("user_id", userId));
    await deleteOptionalRows(() => serviceSupabase.from("balance_transactions").delete().eq("user_id", userId));

    const { error: linkedApplicationsError } = await serviceSupabase
      .from("applications")
      .delete()
      .eq("user_id", userId);
    if (linkedApplicationsError && isMissingOptionalSchemaObject(linkedApplicationsError)) {
      if (data.user.email) {
        await deleteOptionalRows(() => serviceSupabase.from("applications").delete().ilike("email", data.user.email!));
      }
    } else if (linkedApplicationsError) {
      throw linkedApplicationsError;
    } else if (data.user.email) {
      await deleteOptionalRows(() => serviceSupabase.from("applications").delete().ilike("email", data.user.email!));
    }

    const { error: authError } = await serviceSupabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;
    res.json({ id: userId });
  } catch (deleteError) {
    console.error("[api] Unable to delete user and linked records.", deleteError);
    res.status(500).json({ error: "Unable to delete user and linked records." });
  }
};

export const updateAdminUserStatus: RequestHandler = async (req, res) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  const serviceSupabase = getServiceRoleClient(res);
  if (!serviceSupabase) return;
  const userId = typeof req.params.id === "string" ? req.params.id : "";
  if (!userId) {
    res.status(400).json({ error: "A user id is required." });
    return;
  }

  const status = req.body?.status as AdminUserStatus;
  if (status !== "Active" && status !== "Suspended") {
    res.status(400).json({ error: "Invalid account status." });
    return;
  }

  const { data, error } = await serviceSupabase.auth.admin.updateUserById(userId, {
    ban_duration: status === "Suspended" ? "876000h" : "none",
  });
  if (error || !data.user) {
    console.error("[api] Unable to update account status.", error);
    res.status(500).json({ error: "Unable to update account status." });
    return;
  }

  void notifyUser({
    userId,
    type: "balance_adjusted",
    title: status === "Suspended" ? "Account Suspended" : "Account Reactivated",
    message:
      status === "Suspended"
        ? "Your account has been suspended. Please contact support for assistance."
        : "Your account has been reactivated. You can resume using the platform.",
    link: "/dashboard",
  });

  res.json(toAdminUser(data.user));
};
