import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Use inside Server Components, Route Handlers, and Server Actions.
// Reads/writes the auth session via cookies so it stays in sync with the browser client.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
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
