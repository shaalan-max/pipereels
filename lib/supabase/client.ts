import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    const { url, key } = publicEnv();
    client = createBrowserClient(url, key);
  }
  return client;
}
