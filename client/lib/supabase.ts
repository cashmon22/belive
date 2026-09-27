import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const clientOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
};

let _client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(supabaseUrl, supabasePublishableKey, clientOptions);
  }
  return _client;
}

// Lazy proxy so the client is only created on first use, not at module load.
// This lets the app boot in the browser when Supabase env vars are absent or invalid.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
