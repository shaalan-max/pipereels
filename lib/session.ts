import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AgencySettings, Profile } from "@/lib/types";

const DEFAULT_SETTINGS: AgencySettings = {
  id: 1,
  name: "Pipelooms",
  tagline: "Video content, handled.",
  brand_color: "#4F46E5",
  logo_url: null,
};

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { data: settings }] = await Promise.all([
    user ? supabase.from("profiles").select("*").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("agency_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  return {
    supabase,
    user,
    profile: (profile as Profile | null) ?? null,
    settings: (settings as AgencySettings | null) ?? DEFAULT_SETTINGS,
  };
}

/** Signed in with an active profile — otherwise to /login or /no-access (never a redirect loop). */
export async function requireProfile() {
  const s = await getSession();
  if (!s.user) redirect("/login");
  if (!s.profile || !s.profile.active) redirect("/no-access");
  return s as typeof s & { profile: Profile };
}

export async function requireTeam() {
  const s = await requireProfile();
  if (s.profile.role === "client") redirect("/portal");
  return s;
}

export async function requireClientUser() {
  const s = await requireProfile();
  if (s.profile.role !== "client") redirect("/dashboard");
  return s;
}

export async function getPublicSettings(): Promise<AgencySettings> {
  const s = await getSession();
  return s.settings;
}
