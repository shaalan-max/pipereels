"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, ErrorText, Field, Input } from "@/components/ui";

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkError ? "That link has expired or was already used. Request a new one." : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      setError("Incorrect email or password.");
      return;
    }
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    // Full page load so the new session cookie is used everywhere (avoids racing client transitions).
    window.location.assign(safe);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email">
        <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </Field>
      <Field label="Password">
        <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        Sign in
      </Button>
      <p className="text-center text-[13px]">
        <Link href="/forgot-password" className="font-medium text-brand hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
