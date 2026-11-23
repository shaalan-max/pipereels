import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out";

export default async function NoAccess() {
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (profile?.active) redirect("/");
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">Your account isn&apos;t active</h1>
        <p className="mt-2 text-sm text-zinc-500">
          You&apos;re signed in as {user.email}, but this account has no access yet or was deactivated. Please contact your account manager.
        </p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
