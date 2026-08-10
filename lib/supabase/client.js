import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // These pages are Client Components that fetch their real data in useEffect,
  // after the component mounts in an actual browser. But Next.js still runs
  // Client Components once in Node during the build's static-prerender pass to
  // produce a fallback shell — and @supabase/ssr throws immediately if the URL
  // is missing/invalid, which crashed the build whenever env vars weren't wired
  // up yet. Since that prerendered client is never actually used to fetch data
  // (the real fetch happens after hydration, in the browser, where real env
  // vars are inlined), it's safe to fall back to placeholder values here.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  return createBrowserClient(url, key);
}
