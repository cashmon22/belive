import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim() ||
  process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseUrl(): string {
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is not configured");
  }

  return supabaseUrl;
}

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

let _client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(getSupabaseUrl(), supabasePublishableKey, clientOptions);
  }
  return _client;
}

// Lazy proxy so the client is only created on first use, not at module load.
// This lets Vite load its config (which imports the server) without crashing
// when Supabase env vars are absent or invalid.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export function createAuthenticatedSupabaseClient(accessToken: string) {
  return createClient(getSupabaseUrl(), supabasePublishableKey, {
    ...clientOptions,
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

export function createServiceRoleSupabaseClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createClient(getSupabaseUrl(), supabaseServiceRoleKey, clientOptions);
}
