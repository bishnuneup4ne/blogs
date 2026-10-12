import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service role key bypasses Row Level Security — server-side only.
// Lazily created so `next build` succeeds without env vars present.
let client: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "service-role-key-missing"
    );
  }
  return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getSupabaseAdmin();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});

export default supabaseAdmin;
