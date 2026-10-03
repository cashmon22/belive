import type { RequestHandler } from "express";
import { createAuthenticatedSupabaseClient, createServiceRoleSupabaseClient, supabase } from "../lib/supabase";

async function authenticatedUser(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) {
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
  return { user: data.user, token };
}

export const getContributorReferrals: RequestHandler = async (req, res) => {
  const auth = await authenticatedUser(req, res);
  if (!auth) return;
  const { user, token } = auth;
  const contributorSupabase = createAuthenticatedSupabaseClient(token);
  let service: ReturnType<typeof createServiceRoleSupabaseClient> | undefined;
  const getService = () => (service ??= createServiceRoleSupabaseClient());

  let { data: codeRow, error: codeError } = await contributorSupabase
    .from("contributor_referral_codes")
    .select("code")
    .eq("user_id", user.id)
    .maybeSingle();
  if (codeError) {
    console.error("[api] Unable to load referral code.", codeError);
    res.status(500).json({ error: "Unable to load referral information." });
    return;
  }
  if (!codeRow) {
    const code = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
    let insertError;
    try {
      ({ error: insertError } = await getService().from("contributor_referral_codes").insert({ user_id: user.id, code }));
    } catch (serviceError) {
      console.error("[api] Unable to provision referral code.", serviceError);
      res.status(503).json({ error: "Referral data is unavailable." });
      return;
    }
    if (insertError && insertError.code !== "23505") {
      console.error("[api] Unable to create referral code.", insertError);
      res.status(500).json({ error: "Unable to create referral information." });
      return;
    }
    const result = await contributorSupabase.from("contributor_referral_codes").select("code").eq("user_id", user.id).single();
    codeRow = result.data;
    if (result.error || !codeRow) {
      res.status(500).json({ error: "Unable to load referral information." });
      return;
    }
  }

  const { data: referrals, error } = await contributorSupabase
    .from("contributor_referrals")
    .select("id, referred_user_id, status, created_at, reward_transaction_id")
    .eq("referrer_user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[api] Unable to load referrals.", error);
    res.status(500).json({ error: "Unable to load referral history." });
    return;
  }

  const transactionIds = (referrals ?? []).map((referral) => referral.reward_transaction_id).filter((id): id is string => Boolean(id));
  const rewardByReferral = new Map<string, number>();
  if (transactionIds.length) {
    const { data: transactions, error: transactionError } = await contributorSupabase.from("balance_transactions")
      .select("id, user_id, amount, type")
      .in("id", transactionIds)
      .eq("user_id", user.id)
      .eq("type", "Added");
    if (transactionError) {
      console.error("[api] Unable to load referral reward transactions.", transactionError);
      res.status(500).json({ error: "Unable to load referral history." });
      return;
    }
    for (const transaction of transactions ?? []) rewardByReferral.set(transaction.id, Number(transaction.amount));
  }

  const relatedIds = new Set((referrals ?? []).map((referral) => referral.referred_user_id));
  const names = new Map<string, string>();
  let page = 1;
  while (names.size < relatedIds.size) {
    let usersResult;
    try {
      usersResult = await getService().auth.admin.listUsers({ page, perPage: 100 });
    } catch (serviceError) {
      console.error("[api] Unable to load referred contributor names.", serviceError);
      res.status(503).json({ error: "Referral data is unavailable." });
      return;
    }
    const { data: users, error: usersError } = usersResult;
    if (usersError) {
      console.error("[api] Unable to load referred contributor names.", usersError);
      res.status(500).json({ error: "Unable to load referral history." });
      return;
    }
    for (const entry of users.users) {
      if (!relatedIds.has(entry.id)) continue;
      names.set(entry.id, typeof entry.user_metadata?.full_name === "string" && entry.user_metadata.full_name.trim()
        ? entry.user_metadata.full_name.trim()
        : "Contributor");
    }
    if (users.users.length < 100) break;
    page++;
  }
  const history = (referrals ?? []).map((referral) => ({
    id: referral.id,
    referredContributor: names.get(referral.referred_user_id) ?? "Contributor",
    date: referral.created_at,
    status: referral.status,
    reward: referral.reward_transaction_id ? rewardByReferral.get(referral.reward_transaction_id) ?? null : null,
  }));
  res.setHeader("Cache-Control", "no-store");
  res.json({
    code: codeRow.code,
    total: history.length,
    successful: history.filter((referral) => referral.status === "Successful").length,
    pending: history.filter((referral) => referral.status === "Pending").length,
    history,
  });
};
