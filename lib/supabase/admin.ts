import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

// Bypasses Row Level Security. Server-only; used by /api/admin/* after checking the caller's role.
export function hasServiceKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Vercel → Settings → Environment Variables (and .env.local for local use)."
    );
  }
  return createSupabaseClient(publicEnv().url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
