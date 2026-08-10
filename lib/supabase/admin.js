import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY. Uses the service role key which bypasses Row Level Security entirely.
// Never import this file from a Client Component or expose SUPABASE_SERVICE_ROLE_KEY
// with a NEXT_PUBLIC_ prefix. Only used by the admin API routes (creating team members
// and client sub-accounts), each of which first verifies the caller is an 'owner'.
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in your environment variables (see .env.example)."
    );
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
