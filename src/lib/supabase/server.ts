import "server-only";

import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let client: SupabaseClient | null = null;

function get(): SupabaseClient {
  if (!client) {
    client = createClient(
      env.supabaseUrl || "http://localhost:54321",
      env.supabaseServiceKey || "service-role-key-missing",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}

/** Service-role client — server only, bypasses RLS. */
export const db = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = get();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});

export function isMissingSchema(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /does not exist|Could not find the table|schema cache/i.test(error.message ?? "")
  );
}
