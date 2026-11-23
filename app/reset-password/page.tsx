import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthCard } from "@/components/AuthCard";
import { ResetForm } from "./form";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const { user, settings } = await getSession();
  if (!user) redirect("/login?error=link");
  return (
    <AuthCard settings={settings} title="Choose a new password" subtitle={user.email ?? undefined}>
      <ResetForm />
    </AuthCard>
  );
}
