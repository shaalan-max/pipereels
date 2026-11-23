"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, ErrorText, Field, Input } from "@/components/ui";

export function SetupForm({ defaultAgency }: { defaultAgency: string }) {
  const [form, setForm] = useState({ agency_name: defaultAgency, full_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(json.error || "Setup failed");
    }
    await createClient().auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    window.location.assign("/dashboard");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Agency name">
        <Input required value={form.agency_name} onChange={set("agency_name")} />
      </Field>
      <Field label="Your full name">
        <Input required value={form.full_name} onChange={set("full_name")} />
      </Field>
      <Field label="Your email">
        <Input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
      </Field>
      <Field label="Password" hint="At least 10 characters.">
        <Input type="password" required autoComplete="new-password" value={form.password} onChange={set("password")} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        Create owner account
      </Button>
    </form>
  );
}
