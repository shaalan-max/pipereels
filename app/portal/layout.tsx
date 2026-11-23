import { requireClientUser } from "@/lib/session";
import { PortalShell } from "@/components/Shells";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile, settings, supabase } = await requireClientUser();
  const { data: client } = await supabase.from("clients").select("name").eq("id", profile.client_id!).maybeSingle();
  return (
    <PortalShell profile={profile} settings={settings} clientName={client?.name ?? "Your workspace"}>
      {children}
    </PortalShell>
  );
}
