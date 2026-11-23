"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import { errorMessage } from "@/lib/format";

export function ResetForm() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 10) return setError("Use at least 10 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    window.location.assign("/");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="New password" hint="At least 10 characters.">
        <Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </Field>
      <Field label="Repeat new password">
        <Input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        Save and continue
      </Button>
    </form>
  );
}
