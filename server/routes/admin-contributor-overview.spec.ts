import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";
import { getAdminContributorOverview } from "./admin-users";
import { getMyApplication } from "./admin-applications";

vi.mock("../lib/supabase", () => ({
  supabase: { auth: { getUser: vi.fn() } },
  createServiceRoleSupabaseClient: vi.fn(),
}));

const contributor = {
  id: "contributor-1",
  email: "contributor@example.test",
  app_metadata: { role: "admin" },
  user_metadata: { phone: "555-0100" },
};
const application = {
  submission_id: "application-1",
  first_name: "Taylor",
  last_name: "Contributor",
  email: contributor.email,
  phone: "555-0101",
  status: "Under Review",
  verification_status: "Not Verified",
  created_at: "2026-01-01T00:00:00Z",
};

let applicationRows: typeof application[];
let applicationCalls: Array<{ filters: Array<[string, unknown]> }>;
let service: any;

function createService() {
  applicationCalls = [];
  const from = (table: string) => {
    const filters: Array<[string, unknown]> = [];
    const query: any = {
      select() { return query; },
      eq(column: string, value: unknown) { filters.push([column, value]); return query; },
      ilike(column: string, value: unknown) { filters.push([column, value]); return query; },
      order() { return query; },
      limit() { return query; },
      maybeSingle() {
        if (table === "applications") applicationCalls.push({ filters: [...filters] });
        return Promise.resolve({ data: table === "applications" ? applicationRows[0] ?? null : null, error: null });
      },
      then(onFulfilled: (value: any) => unknown, onRejected?: (reason: unknown) => unknown) {
        if (table === "applications") applicationCalls.push({ filters: [...filters] });
        const data = table === "applications" ? applicationRows : [];
        return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected);
      },
    };
    return query;
  };

  service = {
    from,
    auth: {
      admin: {
        getUserById: vi.fn(async () => ({ data: { user: contributor }, error: null })),
      },
    },
  };
  vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(service);
}

function request(id = contributor.id) {
  return {
    headers: { authorization: "Bearer test-token" },
    params: { id },
  } as unknown as Request;
}

function response() {
  const result: { statusCode: number; body: any } = { statusCode: 200, body: undefined };
  const res = {
    status(code: number) { result.statusCode = code; return res; },
    json(body: unknown) { result.body = body; return res; },
  } as unknown as Response;
  return { res, result };
}

async function invoke(handler: unknown, req: Request) {
  const { res, result } = response();
  await (handler as (req: Request, res: Response) => Promise<void>)(req, res);
  return result;
}

beforeEach(() => {
  applicationRows = [];
  vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: contributor } as never, error: null });
  createService();
});

describe("contributor application lookups", () => {
  it("loads an application in the admin contributor overview by email", async () => {
    applicationRows = [application];

    const result = await invoke(getAdminContributorOverview, request());

    expect(result.statusCode).toBe(200);
    expect(result.body.application).toMatchObject({
      fullName: "Taylor Contributor",
      email: contributor.email,
      phone: "555-0101",
      status: "Under Review",
    });
    expect(result.body.deviceRequests).toEqual([]);
    expect(result.body.tasks).toEqual([]);
    expect(result.body.earnings).toBeNull();
    expect(result.body.conversations).toEqual([]);
    expect(applicationCalls).toContainEqual({ filters: [["email", contributor.email]] });
  });

  it("returns an empty application state in the admin overview", async () => {
    const result = await invoke(getAdminContributorOverview, request());

    expect(result.statusCode).toBe(200);
    expect(result.body.application).toBeNull();
    expect(result.body.deviceRequests).toEqual([]);
    expect(result.body.tasks).toEqual([]);
    expect(result.body.earnings).toBeNull();
    expect(result.body.conversations).toEqual([]);
  });

  it("loads the signed-in user's application by email", async () => {
    applicationRows = [application];

    const result = await invoke(getMyApplication, request());

    expect(result.statusCode).toBe(200);
    expect(result.body.application).toEqual({
      id: "application-1",
      status: "Under Review",
      verificationStatus: "Not Verified",
      submittedAt: application.created_at,
    });
    expect(applicationCalls).toContainEqual({ filters: [["email", contributor.email]] });
  });

  it("returns null when the signed-in user has no application", async () => {
    const result = await invoke(getMyApplication, request());

    expect(result.statusCode).toBe(200);
    expect(result.body.application).toBeNull();
  });

  it("never uses user_id for application lookups", async () => {
    applicationRows = [application];
    await invoke(getAdminContributorOverview, request());
    await invoke(getMyApplication, request());

    expect(applicationCalls.length).toBeGreaterThan(0);
    expect(applicationCalls.flatMap((call) => call.filters).every(([column]) => column !== "user_id")).toBe(true);
  });
});
