import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "./form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { user, settings } = await getSession();
  const sp = await searchParams;
  if (user) redirect("/");
  return (
    <AuthCard settings={settings} title="Welcome back" subtitle="Sign in to your portal">
      <LoginForm next={sp.next} linkError={sp.error === "link"} />
    </AuthCard>
  );
}
