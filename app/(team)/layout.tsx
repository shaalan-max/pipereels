import { requireTeam } from "@/lib/session";
import { TeamShell } from "@/components/Shells";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const { profile, settings } = await requireTeam();
  return (
    <TeamShell profile={profile} settings={settings}>
      {children}
    </TeamShell>
  );
}
