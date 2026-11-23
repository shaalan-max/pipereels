import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** The signed-in caller of an API route, with their profile (RLS applies to `supabase`). */
export async function getCaller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile || !(profile as Profile).active) return null;
  return { supabase, profile: profile as Profile };
}

export async function callerCanManageClient(supabase: Awaited<ReturnType<typeof createClient>>, profile: Profile, clientId: string) {
  if (profile.role === "owner") return true;
  if (profile.role !== "account_manager") return false;
  const { data } = await supabase.rpc("has_client_access", { cid: clientId });
  return data === true;
}
