"use client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export function SignOutButton() {
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await createClient().auth.signOut();
        window.location.assign("/login");
      }}
    >
      Sign out
    </Button>
  );
}
