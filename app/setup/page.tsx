import Link from "next/link";
import { getSession } from "@/lib/session";
import { createAdminClient, hasServiceKey } from "@/lib/supabase/admin";
import { AuthCard } from "@/components/AuthCard";
import { SetupForm } from "./form";

export const metadata = { title: "Set up" };

export default async function SetupPage() {
  const { settings } = await getSession();

  if (!hasServiceKey()) {
    return (
      <AuthCard settings={settings} title="One more setting needed" subtitle="The server can't create accounts yet.">
        <p className="text-sm text-zinc-600">
          Add <code className="rounded bg-zinc-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to the environment variables (Vercel → Settings → Environment
          Variables), redeploy, then reload this page.
        </p>
      </AuthCard>
    );
  }

  const { count } = await createAdminClient().from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner");
  if ((count ?? 0) > 0) {
    return (
      <AuthCard settings={settings} title="Setup is complete" subtitle="An owner account already exists.">
        <Link href="/login" className="font-medium text-brand hover:underline">
          Go to sign in →
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard settings={settings} title="Create your owner account" subtitle="This page works once — it closes after the first owner is created.">
      <SetupForm defaultAgency={settings.name} />
    </AuthCard>
  );
}
