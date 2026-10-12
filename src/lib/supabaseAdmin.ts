import { createClient } from "@supabase/supabase-js";


// Service role key bypasses Row Level Security — server-side only
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export { supabaseAdmin };
export default supabaseAdmin;
