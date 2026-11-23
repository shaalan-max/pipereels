"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgencySettings } from "@/lib/types";
import { AuthCard } from "@/components/AuthCard";
import { Button, ErrorText, Field, Input } from "@/components/ui";

const FALLBACK: AgencySettings = { id: 1, name: "Pipelooms", tagline: "Video content, handled.", brand_color: "#4F46E5", logo_url: null };

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<AgencySettings>(FALLBACK);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("agency_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }: { data: AgencySettings | null }) => data && setSettings(data));
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error && /rate/i.test(error.message)) return setError("Too many requests — please wait a few minutes and try again.");
    // Same message whether or not the email exists, so accounts can't be discovered.
    setSent(true);
  }

  return (
    <AuthCard settings={settings} title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            If an account exists for <strong>{email}</strong>, a reset link is on its way. Open it on this device.
          </p>
          <Link href="/login" className="block text-center text-[13px] font-medium text-brand hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Send reset link
          </Button>
          <Link href="/login" className="block text-center text-[13px] font-medium text-zinc-500 hover:text-zinc-800">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
