import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// See lib/supabase/client.js for why these two specific values are safe to fall back to.
const FALLBACK_URL = "https://ogehuqorluzhbfuygsjc.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZWh1cW9ybHV6aGJmdXlnc2pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTQ4MzUsImV4cCI6MjEwMTg3MDgzNX0.XpMaHtmgigFr_2cG3tE3OVApd69omz8__fbuMRkbwZY";

// Use inside Server Components, Route Handlers, and Server Actions.
// Reads/writes the auth session via cookies so it stays in sync with the browser client.
export function createClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

  return createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies — middleware handles refresh instead.
          }
        },
      },
    }
  );
}
