import "server-only";

import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/** Determine if Supabase is truly configured with real credentials. */
function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceKey);
}

/** No-op client used when Supabase is not configured. All operations silently
   fail, which the data layer interprets as “fall back to files”. */
function getNoOpClient() {
  const noOp: Record<string, unknown> = {};
  return new Proxy(noOp, {
    get(_target, prop) {
      const value = Reflect.get(noOp, prop);
      return typeof value === "function" ? () => {} : value;
    },
  }) as unknown as SupabaseClient;
}

let client: SupabaseClient | null = null;

function get(): SupabaseClient {
  if (!client) {
    if (isSupabaseConfigured()) {
      client = createClient(
        env.supabaseUrl,
        env.supabaseServiceKey,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
    } else {
      // Do not create a client with placeholder credentials.
      client = getNoOpClient();
    }
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
