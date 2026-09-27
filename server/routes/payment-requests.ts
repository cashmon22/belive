import crypto from "node:crypto";
import type { Request, RequestHandler } from "express";
import type { User } from "@supabase/supabase-js";
import { createAuthenticatedSupabaseClient, createServiceRoleSupabaseClient, supabase } from "../lib/supabase";
import { vendorDevices, type VendorDevice } from "../../shared/vendor-data";
import type {
  CreatePaymentRequestInput,
  PaymentRequestStatus,
} from "../../shared/payment-requests";

const allowedStatuses: PaymentRequestStatus[] = [
  "Under Review",
  "Approved",
  "Rejected",
  "Completed",
];

type AuthenticatedRequest = Request & { user?: User };

async function getAuthenticatedUser(
  req: Request,
  res: Parameters<RequestHandler>[1],
) {
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

function requireText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

// PostgREST may return PGRST204 (schema cache miss) or PostgreSQL may return
// 42703 (undefined_column) when rejection_reason/reviewed_at don't exist yet.
function isMissingColumnError(error: { code?: string } | null): boolean {
  return !!error && (error.code === "42703" || error.code === "PGRST204");
}

function logPaymentRequestFailure(stage: string, error: unknown) {
  const details = error && typeof error === "object" ? error as Record<string, unknown> : {};
  console.error("Payment request failed", {
    stage,
    message: typeof details.message === "string" ? details.message : "Unknown error",
    code: typeof details.code === "string" ? details.code : undefined,
    details: typeof details.details === "string" ? details.details : undefined,
    hint: typeof details.hint === "string" ? details.hint : undefined,
  });
}

const baseSelect = "id, user_id, full_legal_name, email, phone, delivery_address, city, state_province, postal_code, country, device_id, device_name, device_model, device_amount, currency, vendor, status, created_at";
const fullSelect = `${baseSelect}, rejection_reason, reviewed_at`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRequest(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    fullLegalName: row.full_legal_name,
    email: row.email,
    phone: row.phone,
    deliveryAddress: row.delivery_address,
    city: row.city,
    stateProvince: row.state_province,
    postalCode: row.postal_code,
    country: row.country,
    deviceId: row.device_id,
    deviceName: row.device_name,
    deviceModel: row.device_model,
    deviceAmount: row.device_amount,
    currency: row.currency,
    vendor: row.vendor,
    status: row.status,
    createdAt: row.created_at,
    rejectionReason: row.rejection_reason ?? null,
    reviewedAt: row.reviewed_at ?? null,
  };
}

export const createPaymentRequest: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { user, supabase: authenticatedSupabase } = context;

  const body = req.body as Partial<CreatePaymentRequestInput>;
  if (
    !requireText(body.deviceId) ||
    !requireText(body.fullLegalName) ||
    !requireText(body.phone) ||
    !requireText(body.deliveryAddress) ||
    !requireText(body.city) ||
    !requireText(body.stateProvince) ||
    !requireText(body.postalCode) ||
    !requireText(body.country) ||
    body.confirmation !== true
  ) {
    res.status(400).json({
      error:
        "Complete all required fields and confirm the information provided.",
    });
    return;
  }

  // Prevent duplicate active requests for the same device.
  // "Active" = Under Review or Approved. Rejected requests allow re-submission.
  const { data: existingActive } = await authenticatedSupabase
    .from("payment_requests")
    .select(baseSelect)
    .eq("user_id", user.id)
    .eq("device_id", body.deviceId)
    .in("status", ["Under Review", "Approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingActive) {
    res.status(200).json(mapRequest(existingActive));
    return;
  }

  const staticDevice = vendorDevices.find((item) => item.id === body.deviceId);
  let device: Pick<VendorDevice, "id" | "name" | "model" | "price" | "currency"> | undefined = staticDevice;

  if (!device) {
    const { data: databaseDevice, error: databaseDeviceError } = await authenticatedSupabase
      .from("devices")
      .select("id,name,model,amount,status")
      .eq("id", body.deviceId)
      .eq("status", "Available")
      .maybeSingle();

    if (databaseDeviceError) {
      logPaymentRequestFailure("device lookup", databaseDeviceError);
      res.status(500).json({ error: "Unable to verify the selected device." });
      return;
    }

    if (databaseDevice) {
      device = {
        id: databaseDevice.id,
        name: databaseDevice.name,
        model: databaseDevice.model,
        price: databaseDevice.amount,
        currency: "USD",
      };
    }
  }

  if (!device) {
    res.status(400).json({ error: "The selected device is not available." });
    return;
  }

  const { data, error } = await authenticatedSupabase
    .from("payment_requests")
    .insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      full_legal_name: body.fullLegalName.trim(),
      email: user.email ?? "",
      phone: body.phone.trim(),
      delivery_address: body.deliveryAddress.trim(),
      city: body.city.trim(),
      state_province: body.stateProvince.trim(),
      postal_code: body.postalCode.trim(),
      country: body.country.trim(),
      device_id: device.id,
      device_name: device.name,
      device_model: device.model,
      device_amount: device.price,
      currency: device.currency,
      vendor: "Trusted Vendor",
      status: "Under Review",
    })
    .select(fullSelect)
    .single();

  if (isMissingColumnError(error)) {
    // rejection_reason/reviewed_at columns don't exist yet — retry without them
    const { data: fallback, error: fallbackError } = await authenticatedSupabase
      .from("payment_requests")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        full_legal_name: body.fullLegalName.trim(),
        email: user.email ?? "",
        phone: body.phone.trim(),
        delivery_address: body.deliveryAddress.trim(),
        city: body.city.trim(),
        state_province: body.stateProvince.trim(),
        postal_code: body.postalCode.trim(),
        country: body.country.trim(),
        device_id: device.id,
        device_name: device.name,
        device_model: device.model,
        device_amount: device.price,
        currency: device.currency,
        vendor: "Trusted Vendor",
        status: "Under Review",
      })
      .select(baseSelect)
      .single();

    if (fallbackError) {
      logPaymentRequestFailure("payment request insert", fallbackError);
      res.status(500).json({ error: "Unable to save the payment request." });
      return;
    }
    res.status(201).json(mapRequest(fallback));
    return;
  }

  if (error) {
    logPaymentRequestFailure("payment request insert", error);
    res.status(500).json({ error: "Unable to save the payment request." });
    return;
  }

  res.status(201).json(mapRequest(data));
};

export const listPaymentRequests: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { user, supabase: authenticatedSupabase } = context;

  let query = authenticatedSupabase
    .from("payment_requests")
    .select(fullSelect)
    .order("created_at", { ascending: false });
  if (!isAdmin(user)) query = query.eq("user_id", user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any[] | null;
  let result = await query;

  if (isMissingColumnError(result.error)) {
    // rejection_reason/reviewed_at columns don't exist yet — retry without them
    let fallbackQuery = authenticatedSupabase
      .from("payment_requests")
      .select(baseSelect)
      .order("created_at", { ascending: false });
    if (!isAdmin(user)) fallbackQuery = fallbackQuery.eq("user_id", user.id);
    const fallback = await fallbackQuery;
    data = fallback.data;
    result = { data: fallback.data, error: fallback.error } as typeof result;
  } else {
    data = result.data;
  }

  const error = result.error;
  if (error) {
    res.status(500).json({ error: "Unable to load payment requests." });
    return;
  }

  res.json(data.map(mapRequest));
};

export const updatePaymentRequestStatus: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { user } = context;
  if (!isAdmin(user)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const status = req.body?.status as PaymentRequestStatus;
  if (!allowedStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid payment request status" });
    return;
  }

  const rejectionReason = typeof req.body?.rejectionReason === "string" ? req.body.rejectionReason.trim() : null;
  const updateData: Record<string, unknown> = { status, reviewed_at: new Date().toISOString() };
  if (status === "Rejected" && rejectionReason) {
    updateData.rejection_reason = rejectionReason;
  } else if (status !== "Rejected") {
    updateData.rejection_reason = null;
  }

  // Use the service role client so the update bypasses RLS.
  // Admin authorization is already verified above via isAdmin(user).
  const serviceSupabase = createServiceRoleSupabaseClient();

  let { data, error } = await serviceSupabase
    .from("payment_requests")
    .update(updateData)
    .eq("id", req.params.id)
    .select("id, status")
    .single();

  if (isMissingColumnError(error)) {
    // rejection_reason/reviewed_at columns don't exist — retry with just status
    const fallback = await serviceSupabase
      .from("payment_requests")
      .update({ status })
      .eq("id", req.params.id)
      .select("id, status")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    logPaymentRequestFailure("status update", error);
    res.status(500).json({ error: "Unable to update payment request status." });
    return;
  }

  res.json(data);
};

export const deletePaymentRequest: RequestHandler = async (req, res) => {
  const context = await getAuthenticatedUser(req, res);
  if (!context) return;
  const { user } = context;
  if (!isAdmin(user)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  // Use the service role client so the delete bypasses RLS.
  // Admin authorization is already verified above via isAdmin(user).
  const serviceSupabase = createServiceRoleSupabaseClient();

  const { data, error } = await serviceSupabase
    .from("payment_requests")
    .delete()
    .eq("id", req.params.id)
    .select("id")
    .single();

  if (error) {
    logPaymentRequestFailure("delete", error);
    res.status(500).json({ error: "Unable to delete payment request." });
    return;
  }

  res.json(data);
};

export type { AuthenticatedRequest };
