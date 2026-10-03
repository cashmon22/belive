import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";
import { createKycDraft, reviewKyc } from "./kyc";

vi.mock("../lib/supabase", () => ({
  supabase: { auth: { getUser: vi.fn() } },
  createServiceRoleSupabaseClient: vi.fn(),
}));
vi.mock("../lib/notifications", () => ({ notifyAdmins: vi.fn(), notifyUser: vi.fn() }));

function request(body: unknown = {}, authorization = "Bearer user-token") {
  return { headers: { authorization }, body, params: { id: "a7b31bf0-e6f7-4e83-92bd-f6e8638f91b4" } } as unknown as Request;
}

function response() {
  const result: { statusCode: number; body: unknown } = { statusCode: 200, body: undefined };
  const res = {
    status(code: number) { result.statusCode = code; return res; },
    json(body: unknown) { result.body = body; return res; },
  } as unknown as Response;
  return { res, result };
}

beforeEach(() => {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: "contributor-1", app_metadata: {} } } as never, error: null });
});

describe("KYC authorization", () => {
  it("does not allow contributors to make an administrator review decision", async () => {
    const { res, result } = response();

    await reviewKyc(request({ status: "approved" }), res, () => undefined);

    expect(result.statusCode).toBe(403);
    expect(createServiceRoleSupabaseClient).not.toHaveBeenCalled();
  });

  it("does not start KYC before device approval", async () => {
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "limit"]) query[method] = vi.fn(() => query);
    query.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const from = vi.fn(() => query);
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({ from } as never);
    const { res, result } = response();

    await createKycDraft(request(), res, () => undefined);

    expect(result.statusCode).toBe(403);
    expect(from).toHaveBeenCalledWith("payment_requests");
    expect(from).not.toHaveBeenCalledWith("contributor_kyc_submissions");
  });
});
