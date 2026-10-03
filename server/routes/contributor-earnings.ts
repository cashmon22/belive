import type { RequestHandler } from "express";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";

export const getContributorEarnings: RequestHandler = async (req, res) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const service = createServiceRoleSupabaseClient();
    const { data, error } = await service.from("contributor_earnings")
      .select("available_balance, pending_earnings, total_withdrawn, payment_gateway_configured")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    res.json({
      availableBalance: Number(data?.available_balance) || 0,
      pendingEarnings: Number(data?.pending_earnings) || 0,
      totalWithdrawn: Number(data?.total_withdrawn) || 0,
      paymentGatewayConfigured: Boolean(data?.payment_gateway_configured),
    });
  } catch (error) {
    console.error("[api] Unable to load contributor earnings.", error);
    res.status(500).json({ error: "Unable to load contributor earnings." });
  }
};
