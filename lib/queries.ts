import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client, Plan, Profile, Video } from "@/lib/types";
import { must } from "@/components/Me";

export async function loadDirectory(supabase: SupabaseClient) {
  const [clients, people] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("profiles").select("*").order("full_name"),
  ]);
  const c = must(clients) as Client[];
  const p = must(people) as Profile[];
  return {
    clients: c,
    people: p,
    clientMap: new Map(c.map((x) => [x.id, x])),
    peopleMap: new Map(p.map((x) => [x.id, x])),
  };
}

export async function loadActiveVideos(supabase: SupabaseClient, clientId?: string) {
  let q = supabase.from("videos").select("*").order("stage_changed_at", { ascending: true });
  if (clientId) q = q.eq("client_id", clientId);
  return must(await q) as Video[];
}

export async function loadPlans(supabase: SupabaseClient, clientId?: string) {
  let q = supabase.from("content_plans").select("*").order("month", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  return must(await q) as Plan[];
}
