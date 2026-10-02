import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceRoleSupabaseClient, supabase } from "../lib/supabase";
import { deleteAdminApplication } from "./admin-applications";
import { deleteAdminUser } from "./admin-users";
import { deletePaymentRequest } from "./payment-requests";
import { deleteAdminConversation } from "./vendor-messages";

vi.mock("../lib/supabase", () => ({
  supabase: { auth: { getUser: vi.fn() } },
  createServiceRoleSupabaseClient: vi.fn(),
  createAuthenticatedSupabaseClient: vi.fn(),
}));

const testIds = {
  user: "test-user-001",
  application: "test-application-001",
  request: "test-request-001",
  conversation: "test-conversation-001",
};

let calls: Array<{ table: string; operation: string; filters: Array<[string, string, unknown]> }>;
let service: any;
let targetIsAdmin: boolean;

function createService() {
  calls = [];
  const from = (table: string) => {
    let operation = "select";
    const filters: Array<[string, string, unknown]> = [];
    const query: any = {
      delete() { operation = "delete"; return query; },
      select() { return query; },
      eq(column: string, value: unknown) { filters.push(["eq", column, value]); return query; },
      ilike(column: string, value: unknown) { filters.push(["ilike", column, value]); return query; },
      in(column: string, value: unknown) { filters.push(["in", column, value]); return query; },
      is(column: string, value: unknown) { filters.push(["is", column, value]); return query; },
      maybeSingle() { return Promise.resolve(resolve()); },
      single() { return Promise.resolve(resolve()); },
      then(onFulfilled: (value: any) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(resolve()).then(onFulfilled, onRejected);
      },
    };
    const resolve = () => {
      calls.push({ table, operation, filters: [...filters] });
      if (table === "vendor_conversations" && operation === "select") return { data: [{ id: testIds.conversation }], error: null };
      if (table === "vendor_conversations" && filters.some((filter) => filter[1] === "id")) return { data: { id: testIds.conversation }, error: null };
      if (table === "applications" && operation === "delete") return { data: { submission_id: testIds.application }, error: null };
      if (table === "payment_requests" && operation === "delete") return { data: { id: testIds.request }, error: null };
      if (table === "vendor_conversations" && operation === "delete") return { data: { id: testIds.conversation }, error: null };
      return { data: null, error: null };
    };
    return query;
  };

  service = {
    from,
    auth: {
      admin: {
        getUserById: vi.fn(async () => ({
          data: { user: { id: testIds.user, email: "test-user@example.test", app_metadata: targetIsAdmin ? { role: "admin" } : {} } },
          error: null,
        })),
        deleteUser: vi.fn(async () => ({ data: {}, error: null })),
      },
    },
  };
  vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(service);
}

function request(id: string) {
  return {
    headers: { authorization: "Bearer test-admin-token" },
    params: { id },
    body: {},
    query: {},
  } as unknown as Request;
}

function response() {
  const result: { statusCode: number; body: unknown } = { statusCode: 200, body: undefined };
  const res = {
    status(code: number) { result.statusCode = code; return res; },
    json(body: unknown) { result.body = body; return res; },
  } as unknown as Response;
  return { res, result };
}

async function invoke(handler: unknown, req: Request, res: Response) {
  await (handler as (req: Request, res: Response) => Promise<void>)(req, res);
}

beforeEach(() => {
  targetIsAdmin = false;
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: { id: "test-admin", app_metadata: { role: "admin" } } as never },
    error: null,
  });
  createService();
});

describe("admin deletion routes", () => {
  it("removes test user-linked rows before deleting the Auth user", async () => {
    const { res, result } = response();
    await invoke(deleteAdminUser, request(testIds.user), res);

    expect(result.statusCode).toBe(200);
    expect(service.auth.admin.deleteUser).toHaveBeenCalledWith(testIds.user);
    expect(calls.some((call) => call.table === "vendor_messages" && call.operation === "delete")).toBe(true);
    expect(calls.some((call) => call.table === "payment_requests" && call.operation === "delete")).toBe(true);
    expect(calls.some((call) => call.table === "applications" && call.filters.some((filter) => filter[0] === "ilike" && filter[2] === "test-user@example.test"))).toBe(true);
  });

  it("refuses to delete an admin account before removing any rows", async () => {
    targetIsAdmin = true;
    createService();
    const { res, result } = response();
    await invoke(deleteAdminUser, request(testIds.user), res);

    expect(result.statusCode).toBe(403);
    expect(calls).toHaveLength(0);
    expect(service.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("deletes a device request after its linked test messages and conversation", async () => {
    const { res, result } = response();
    await invoke(deletePaymentRequest, request(testIds.request), res);

    expect(result.statusCode).toBe(200);
    const messagesIndex = calls.findIndex((call) => call.table === "vendor_messages" && call.operation === "delete");
    const conversationIndex = calls.findIndex((call) => call.table === "vendor_conversations" && call.operation === "delete");
    const requestIndex = calls.findIndex((call) => call.table === "payment_requests" && call.operation === "delete");
    expect(messagesIndex).toBeGreaterThanOrEqual(0);
    expect(conversationIndex).toBeGreaterThan(messagesIndex);
    expect(requestIndex).toBeGreaterThan(conversationIndex);
  });

  it("deletes an application by its submission ID", async () => {
    const { res, result } = response();
    await invoke(deleteAdminApplication, request(testIds.application), res);

    expect(result.statusCode).toBe(200);
    expect(calls).toContainEqual({ table: "applications", operation: "delete", filters: [["eq", "submission_id", testIds.application]] });
  });

  it("deletes test conversation messages before the conversation", async () => {
    const { res, result } = response();
    await invoke(deleteAdminConversation, request(testIds.conversation), res);

    expect(result.statusCode).toBe(200);
    const messagesIndex = calls.findIndex((call) => call.table === "vendor_messages" && call.operation === "delete");
    const conversationIndex = calls.findIndex((call) => call.table === "vendor_conversations" && call.operation === "delete");
    expect(messagesIndex).toBeGreaterThanOrEqual(0);
    expect(conversationIndex).toBeGreaterThan(messagesIndex);
  });
});
