import type { Request, RequestHandler } from "express";
import type { User } from "@supabase/supabase-js";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";
import type {
  AdjustBalanceInput,
  BalanceTransaction,
  BalanceTransactionType,
  UserBalance,
} from "../../shared/admin-balance";

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

function getServiceRoleClient(res: Parameters<RequestHandler>[1]) {
  try {
    return createServiceRoleSupabaseClient();
  } catch {
    res.status(503).json({ error: "Admin balance management is not configured." });
    return null;
  }
}

function validateUserId(req: Request, res: Parameters<RequestHandler>[1]) {
  const userId = typeof req.params.id === "string" ? req.params.id : "";
  if (!userId) {
    res.status(400).json({ error: "A user id is required." });
    return null;
  }
  return userId;
}

function mapTransaction(row: Record<string, unknown>): BalanceTransaction {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    amount: Number(row.amount) || 0,
    type: row.type as BalanceTransactionType,
    previousBalance: Number(row.previous_balance) || 0,
    newBalance: Number(row.new_balance) || 0,
    adminId: row.admin_id as string,
    adminNote: (row.admin_note as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export const getUserBalance: RequestHandler = async (req, res) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  const serviceSupabase = getServiceRoleClient(res);
  if (!serviceSupabase) return;
  const userId = validateUserId(req, res);
  if (!userId) return;

  const { data, error } = await serviceSupabase
    .from("contributor_earnings")
    .select("available_balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: "Unable to load user balance." });
    return;
  }

  const balance: UserBalance = {
    availableBalance: data ? Number(data.available_balance) || 0 : 0,
  };
  res.json(balance);
};

export const addUserBalance: RequestHandler = async (req, res) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  const serviceSupabase = getServiceRoleClient(res);
  if (!serviceSupabase) return;
  const userId = validateUserId(req, res);
  if (!userId) return;

  const body = req.body as Partial<AdjustBalanceInput>;
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "A positive amount is required." });
    return;
  }

  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  const { data, error } = await serviceSupabase.rpc("adjust_user_balance", {
    target_user_id: userId,
    adjustment_amount: amount,
    adjustment_type: "Added",
    acting_admin_id: admin.id,
    admin_note: note,
  });

  if (error) {
    res.status(500).json({ error: "Unable to add balance." });
    return;
  }

  res.status(200).json(mapTransaction(data as unknown as Record<string, unknown>));
};

export const removeUserBalance: RequestHandler = async (req, res) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  const serviceSupabase = getServiceRoleClient(res);
  if (!serviceSupabase) return;
  const userId = validateUserId(req, res);
  if (!userId) return;

  const body = req.body as Partial<AdjustBalanceInput>;
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "A positive amount is required." });
    return;
  }

  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  const { data, error } = await serviceSupabase.rpc("adjust_user_balance", {
    target_user_id: userId,
    adjustment_amount: amount,
    adjustment_type: "Removed",
    acting_admin_id: admin.id,
    admin_note: note,
  });

  if (error) {
    const message = error.message || "";
    if (message.includes("Insufficient balance")) {
      res.status(422).json({ error: "Insufficient balance. The user's balance cannot go negative." });
      return;
    }
    res.status(500).json({ error: "Unable to remove balance." });
    return;
  }

  res.status(200).json(mapTransaction(data as unknown as Record<string, unknown>));
};

export const listBalanceTransactions: RequestHandler = async (req, res) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  const serviceSupabase = getServiceRoleClient(res);
  if (!serviceSupabase) return;
  const userId = validateUserId(req, res);
  if (!userId) return;

  const { data, error } = await serviceSupabase
    .from("balance_transactions")
    .select("id, user_id, amount, type, previous_balance, new_balance, admin_id, admin_note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    res.status(500).json({ error: "Unable to load balance history." });
    return;
  }

  res.json((data ?? []).map((row) => mapTransaction(row as unknown as Record<string, unknown>)));
};
