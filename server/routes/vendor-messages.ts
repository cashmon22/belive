import type { Request, RequestHandler } from "express";
import type { User } from "@supabase/supabase-js";
import { createAuthenticatedSupabaseClient, createServiceRoleSupabaseClient, supabase } from "../lib/supabase";
import { notifyAdmins } from "../lib/notifications";
import type {
  VendorConversation,
  VendorMessage,
  ConversationWithMessages,
} from "../../shared/vendor-messages";

type AuthenticatedRequest = Request & { user?: User };

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

function isAdmin(user: User) {
  return user.app_metadata?.role === "admin";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConversation(row: any): VendorConversation {
  return {
    id: row.id,
    userId: row.user_id,
    conversationType: row.conversation_type ?? "vendor",
    paymentRequestId: row.payment_request_id ?? null,
    deviceId: row.device_id ?? null,
    deviceName: row.device_name ?? null,
    deviceModel: row.device_model ?? null,
    referenceNumber: row.reference_number ?? null,
    userName: row.user_name,
    userEmail: row.user_email,
    requestStatus: row.request_status ?? null,
    status: row.status,
    lastMessage: row.last_message ?? null,
    lastMessageAt: row.last_message_at ?? null,
    userUnreadCount: row.user_unread_count ?? 0,
    adminUnreadCount: row.admin_unread_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(row: any): VendorMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    body: row.body,
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

const conversationSelect = "id, user_id, conversation_type, payment_request_id, device_id, device_name, device_model, reference_number, user_name, user_email, request_status, status, last_message, last_message_at, user_unread_count, admin_unread_count, created_at, updated_at";
const messageSelect = "id, conversation_id, sender_id, sender_role, body, read_at, created_at";

function referenceNumber(id: string) {
  return `AMZ-${id.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

// POST /api/vendor-conversations — user creates/gets a vendor conversation for a payment request
export const createOrGetConversation: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { user, supabase: authSupabase } = context;

  const { paymentRequestId } = req.body as { paymentRequestId?: string };
  if (!paymentRequestId) {
    res.status(400).json({ error: "Payment request ID is required." });
    return;
  }

  // Look up the payment request to get device info and verify ownership
  const { data: paymentRequest, error: prError } = await authSupabase
    .from("payment_requests")
    .select("id, user_id, device_id, device_name, device_model, full_legal_name, email, status")
    .eq("id", paymentRequestId)
    .maybeSingle();

  if (prError || !paymentRequest) {
    res.status(404).json({ error: "Payment request not found." });
    return;
  }

  if (paymentRequest.user_id !== user.id) {
    res.status(403).json({ error: "You can only create conversations for your own requests." });
    return;
  }

  // Enforce approved-device requirement on the backend
  if (paymentRequest.status !== "Approved") {
    res.status(403).json({ error: "Your device request must be approved before you can message the vendor about this device." });
    return;
  }

  // Check for existing conversation (unique constraint on user_id + payment_request_id for vendor type)
  const { data: existing } = await authSupabase
    .from("vendor_conversations")
    .select(conversationSelect)
    .eq("user_id", user.id)
    .eq("payment_request_id", paymentRequestId)
    .eq("conversation_type", "vendor")
    .maybeSingle();

  if (existing) {
    res.status(200).json(mapConversation(existing));
    return;
  }

  // Create new conversation
  const { data, error } = await authSupabase
    .from("vendor_conversations")
    .insert({
      user_id: user.id,
      conversation_type: "vendor",
      payment_request_id: paymentRequestId,
      device_id: paymentRequest.device_id,
      device_name: paymentRequest.device_name,
      device_model: paymentRequest.device_model,
      reference_number: referenceNumber(paymentRequestId),
      user_name: paymentRequest.full_legal_name,
      user_email: paymentRequest.email,
      request_status: paymentRequest.status,
    })
    .select(conversationSelect)
    .single();

  if (error) {
    // Race condition: another request created it between our check and insert
    if (error.code === "23505") {
      const { data: retry } = await authSupabase
        .from("vendor_conversations")
        .select(conversationSelect)
        .eq("user_id", user.id)
        .eq("payment_request_id", paymentRequestId)
        .eq("conversation_type", "vendor")
        .maybeSingle();
      if (retry) {
        res.status(200).json(mapConversation(retry));
        return;
      }
    }
    console.error("Failed to create conversation", { message: error.message, code: error.code });
    res.status(500).json({ error: "Unable to create conversation." });
    return;
  }

  res.status(201).json(mapConversation(data));
};

// GET /api/vendor-conversations — admin: all, user: own. Optional ?type=vendor|support filter
export const listConversations: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { user, supabase: authSupabase } = context;

  let query = authSupabase
    .from("vendor_conversations")
    .select(conversationSelect)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (!isAdmin(user)) {
    query = query.eq("user_id", user.id);
  }

  const typeFilter = typeof req.query.type === "string" ? req.query.type : "";
  if (typeFilter === "vendor" || typeFilter === "support") {
    query = query.eq("conversation_type", typeFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to list conversations", { message: error.message });
    res.status(500).json({ error: "Unable to load conversations." });
    return;
  }

  res.json((data ?? []).map(mapConversation));
};

// GET /api/vendor-conversations/:id — single conversation with messages
export const getConversation: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { user, supabase: authSupabase } = context;

  const { data: conversation, error: convError } = await authSupabase
    .from("vendor_conversations")
    .select(conversationSelect)
    .eq("id", req.params.id)
    .maybeSingle();

  if (convError || !conversation) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }

  if (!isAdmin(user) && conversation.user_id !== user.id) {
    res.status(403).json({ error: "Access denied." });
    return;
  }

  const { data: messages, error: msgError } = await authSupabase
    .from("vendor_messages")
    .select(messageSelect)
    .eq("conversation_id", req.params.id)
    .order("created_at", { ascending: true });

  if (msgError) {
    console.error("Failed to load messages", { message: msgError.message });
    res.status(500).json({ error: "Unable to load messages." });
    return;
  }

  const result: ConversationWithMessages = {
    ...mapConversation(conversation),
    messages: (messages ?? []).map(mapMessage),
  };

  res.json(result);
};

// POST /api/vendor-conversations/:id/messages — send a message
export const sendMessage: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { user, supabase: authSupabase } = context;

  const body = req.body?.body;
  if (typeof body !== "string" || body.trim().length === 0) {
    res.status(400).json({ error: "Message body is required." });
    return;
  }

  const { data: conversation, error: convError } = await authSupabase
    .from("vendor_conversations")
    .select("id, user_id, user_name, user_unread_count, admin_unread_count")
    .eq("id", req.params.id)
    .maybeSingle();

  if (convError || !conversation) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }

  const admin = isAdmin(user);
  if (!admin && conversation.user_id !== user.id) {
    res.status(403).json({ error: "Access denied." });
    return;
  }

  const senderRole = admin ? "admin" : "user";
  // Track whether this is the first unread message for the admin (for notification dedup)
  const wasAdminUnreadZero = !admin && (conversation.admin_unread_count ?? 0) === 0;

  // Insert the message
  const { data: message, error: msgError } = await authSupabase
    .from("vendor_messages")
    .insert({
      conversation_id: req.params.id,
      sender_id: user.id,
      sender_role: senderRole,
      body: body.trim(),
    })
    .select(messageSelect)
    .single();

  if (msgError) {
    console.error("Failed to send message", { message: msgError.message, code: msgError.code });
    res.status(500).json({ error: "Unable to send message." });
    return;
  }

  // Update conversation: last message, unread count for the other party
  const serviceSupabase = createServiceRoleSupabaseClient();
  const unreadField = admin ? "user_unread_count" : "admin_unread_count";
  const currentCount = admin
    ? (conversation as { user_unread_count?: number }).user_unread_count ?? 0
    : (conversation as { admin_unread_count?: number }).admin_unread_count ?? 0;

  const { error: updateError } = await serviceSupabase
    .from("vendor_conversations")
    .update({
      last_message: body.trim(),
      last_message_at: new Date().toISOString(),
      [unreadField]: currentCount + 1,
    })
    .eq("id", req.params.id);

  if (updateError) {
    console.error("Failed to update conversation metadata", { message: updateError.message });
  }

  // Notify admins only on the first unread message (prevents notification spam)
  if (wasAdminUnreadZero) {
    const userName = (conversation as { user_name?: string }).user_name ?? "A user";
    const isSupport = (conversation as { conversation_type?: string }).conversation_type === "support";
    void notifyAdmins({
      type: "new_message",
      title: "New Message",
      message: `${userName} sent you a new${isSupport ? " Support" : ""} message.`,
      link: "/admin/messages",
      relatedId: req.params.id,
    });
  }

  res.status(201).json(mapMessage(message));
};

// PATCH /api/vendor-conversations/:id/read — mark messages as read for the caller
export const markConversationRead: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { user, supabase: authSupabase } = context;

  const { data: conversation, error: convError } = await authSupabase
    .from("vendor_conversations")
    .select("id, user_id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (convError || !conversation) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }

  const admin = isAdmin(user);
  if (!admin && conversation.user_id !== user.id) {
    res.status(403).json({ error: "Access denied." });
    return;
  }

  // Mark all unread messages from the other party as read
  const otherRole = admin ? "user" : "admin";
  const { error: msgUpdateError } = await authSupabase
    .from("vendor_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", req.params.id)
    .eq("sender_role", otherRole)
    .is("read_at", null);

  if (msgUpdateError) {
    console.error("Failed to mark messages read", { message: msgUpdateError.message });
  }

  // Reset unread count for the caller
  const unreadField = admin ? "admin_unread_count" : "user_unread_count";
  const serviceSupabase = createServiceRoleSupabaseClient();
  const { error: convUpdateError } = await serviceSupabase
    .from("vendor_conversations")
    .update({ [unreadField]: 0 })
    .eq("id", req.params.id);

  if (convUpdateError) {
    console.error("Failed to reset unread count", { message: convUpdateError.message });
  }

  res.json({ success: true });
};

// GET /api/vendor-conversations/support — get or auto-create the user's support conversation
export const getOrCreateSupportConversation: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { user, supabase: authSupabase } = context;

  // Check for existing support conversation
  const { data: existing, error: lookupError } = await authSupabase
    .from("vendor_conversations")
    .select(conversationSelect)
    .eq("user_id", user.id)
    .eq("conversation_type", "support")
    .maybeSingle();

  if (lookupError) {
    console.error("[getOrCreateSupportConversation] SELECT failed", {
      userId: user.id,
      code: lookupError.code,
      message: lookupError.message,
      details: lookupError.details,
      hint: lookupError.hint,
    });
  }

  if (existing) {
    res.json(mapConversation(existing));
    return;
  }

  const fullName = (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "User";
  const email = user.email ?? "";

  // Create new support conversation. The table still has NOT NULL constraints on
  // device-related columns (migration to drop them hasn't been applied yet), so we
  // provide sentinel values that clearly indicate this is a support conversation.
  const { data, error } = await authSupabase
    .from("vendor_conversations")
    .insert({
      user_id: user.id,
      conversation_type: "support",
      payment_request_id: "00000000-0000-0000-0000-000000000000",
      device_id: "support",
      device_name: "Support",
      device_model: "N/A",
      reference_number: "SUPPORT",
      user_name: fullName,
      user_email: email,
    })
    .select(conversationSelect)
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: retry } = await authSupabase
        .from("vendor_conversations")
        .select(conversationSelect)
        .eq("user_id", user.id)
        .eq("conversation_type", "support")
        .maybeSingle();
      if (retry) {
        res.json(mapConversation(retry));
        return;
      }
    }
    console.error("[getOrCreateSupportConversation] INSERT failed", {
      userId: user.id,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    res.status(500).json({ error: "Unable to create support conversation." });
    return;
  }

  res.status(201).json(mapConversation(data));
};

// POST /api/admin/support-conversations — admin creates a support conversation for a user
export const adminCreateSupportConversation: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { user } = context;

  if (!isAdmin(user)) {
    res.status(403).json({ error: "Administrator access required." });
    return;
  }

  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: "User ID is required." });
    return;
  }

  const serviceSupabase = createServiceRoleSupabaseClient();

  // Check for existing support conversation
  const { data: existing, error: lookupError } = await serviceSupabase
    .from("vendor_conversations")
    .select(conversationSelect)
    .eq("user_id", userId)
    .eq("conversation_type", "support")
    .maybeSingle();

  if (lookupError) {
    console.error("[adminCreateSupportConversation] SELECT failed", {
      adminId: user.id,
      targetUserId: userId,
      code: lookupError.code,
      message: lookupError.message,
      details: lookupError.details,
      hint: lookupError.hint,
    });
  }

  if (existing) {
    res.json(mapConversation(existing));
    return;
  }

  // Fetch user info
  const { data: userInfo, error: userError } = await serviceSupabase.auth.admin.getUserById(userId);
  if (userError || !userInfo.user) {
    console.error("[adminCreateSupportConversation] getUserById failed", {
      adminId: user.id,
      targetUserId: userId,
      message: userError?.message,
    });
    res.status(404).json({ error: "User not found." });
    return;
  }

  const targetUser = userInfo.user;
  const fullName = (targetUser.user_metadata?.full_name as string) || targetUser.email?.split("@")[0] || "User";
  const email = targetUser.email ?? "";

  // Create new support conversation with sentinel values for NOT NULL device columns.
  const { data, error } = await serviceSupabase
    .from("vendor_conversations")
    .insert({
      user_id: userId,
      conversation_type: "support",
      payment_request_id: "00000000-0000-0000-0000-000000000000",
      device_id: "support",
      device_name: "Support",
      device_model: "N/A",
      reference_number: "SUPPORT",
      user_name: fullName,
      user_email: email,
    })
    .select(conversationSelect)
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: retry } = await serviceSupabase
        .from("vendor_conversations")
        .select(conversationSelect)
        .eq("user_id", userId)
        .eq("conversation_type", "support")
        .maybeSingle();
      if (retry) {
        res.json(mapConversation(retry));
        return;
      }
    }
    console.error("[adminCreateSupportConversation] INSERT failed", {
      adminId: user.id,
      targetUserId: userId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    res.status(500).json({ error: "Unable to create support conversation." });
    return;
  }

  res.status(201).json(mapConversation(data));
};
