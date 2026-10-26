export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  storageBucket: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "images",
  adminPassword: unquote(process.env.PAGE_ACCESS_PASSWORD ?? ""),
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM_EMAIL ?? "",
};

/** dotenv keeps surrounding quotes; users commonly wrap secrets in them. */
function unquote(value: string): string {
  return value.replace(/^["'](.*)["']$/s, "$1").trim();
}

/** True when the Supabase env is present — data layer falls back to files otherwise. */
export function hasSupabase(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceKey);
}
