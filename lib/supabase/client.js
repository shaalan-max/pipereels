import { createBrowserClient } from "@supabase/ssr";

// NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not secrets — Supabase
// is designed for the anon key to ship in the client bundle; real security comes from
// Row Level Security policies, not from hiding these two values. They fall back to the
// live pipelooms-portal project below so the app works immediately even before Vercel
// env vars are configured. SUPABASE_SERVICE_ROLE_KEY (used only in the admin API routes)
// is the one real secret and always requires manual setup — see README.md.
const FALLBACK_URL = "https://ogehuqorluzhbfuygsjc.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZWh1cW9ybHV6aGJmdXlnc2pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTQ4MzUsImV4cCI6MjEwMTg3MDgzNX0.XpMaHtmgigFr_2cG3tE3OVApd69omz8__fbuMRkbwZY";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;
  return createBrowserClient(url, key);
}
