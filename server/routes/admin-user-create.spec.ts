import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";
import { createAdminUser } from "./admin-users";

vi.mock("../lib/supabase", () => ({
  supabase: { auth: { getUser: vi.fn() } },
  createServiceRoleSupabaseClient: vi.fn(),
}));

const adminUser = { id: "admin-1", app_metadata: { role: "admin" } };
const createdUser = {
  id: "new-user-1",
  email: "new@example.test",
  created_at: "2026-01-01T00:00:00.000Z",
};
let createUser: ReturnType<typeof vi.fn>;

function request(body: unknown, authorization = "Bearer admin-token") {
  return { headers: { authorization }, body } as unknown as Request;
}

function response() {
  const result: { statusCode: number; body: unknown } = { statusCode: 200, body: undefined };
  const res = {
    status(code: number) { result.statusCode = code; return res; },
    json(body: unknown) { result.body = body; return res; },
  } as unknown as Response;
  return { res, result };
}

async function invoke(req: Request) {
  const { res, result } = response();
  await createAdminUser(req, res, () => undefined);
  return result;
}

beforeEach(() => {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: adminUser } as never, error: null });
  createUser = vi.fn(async () => ({ data: { user: createdUser }, error: null }));
  const applicationQuery: Record<string, unknown> = {};
  for (const method of ["select", "ilike", "not", "order", "limit"]) {
    applicationQuery[method] = vi.fn(() => applicationQuery);
  }
  applicationQuery.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
    auth: { admin: { createUser } },
    from: vi.fn(() => applicationQuery),
  } as never);
});

describe("createAdminUser", () => {
  it("rejects requests from non-admin users", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: "user-1", app_metadata: {} } } as never, error: null });

    const result = await invoke(request({ email: "new@example.test", password: "a-secure-password" }));

    expect(result.statusCode).toBe(403);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("validates email and minimum password length before creating an account", async () => {
    const result = await invoke(request({ email: "not-an-email", password: "short" }));

    expect(result.statusCode).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("creates a confirmed user through Auth Admin with the existing profile metadata", async () => {
    const result = await invoke(request({
      email: " New@Example.Test ",
      password: "a-secure-password",
      fullName: "New Contributor",
    }));

    expect(result.statusCode).toBe(201);
    expect(createUser).toHaveBeenCalledWith({
      email: "new@example.test",
      password: "a-secure-password",
      email_confirm: true,
      user_metadata: { full_name: "New Contributor" },
    });
    expect(result.body).toEqual({
      id: "new-user-1",
      email: "new@example.test",
      name: "New Contributor",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(JSON.stringify(result.body)).not.toContain("a-secure-password");
  });

  it("returns a conflict for an existing email without exposing provider details", async () => {
    createUser.mockResolvedValue({ data: { user: null }, error: { message: "User already registered" } });

    const result = await invoke(request({ email: "new@example.test", password: "a-secure-password" }));

    expect(result.statusCode).toBe(409);
    expect(result.body).toEqual({ error: "An account with this email already exists." });
  });
});
