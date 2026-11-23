"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMe, useSupabase } from "@/components/Me";
import { BrandMark, BrandStyle } from "@/components/Shells";
import { Button, Card, CardHeader, ErrorText, Field, Input, PageHeader, useToast } from "@/components/ui";

export default function SettingsPage() {
  const { profile, settings } = useMe();
  const supabase = useSupabase();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ name: settings.name, tagline: settings.tagline, brand_color: settings.brand_color });
  const [busy, setBusy] = useState(false);

  if (profile.role !== "owner") return <ErrorText>Only the owner can change agency settings.</ErrorText>;

  async function save() {
    if (!form.name.trim()) return toast("The agency name can't be empty", "error");
    setBusy(true);
    const { error } = await supabase
      .from("agency_settings")
      .update({ name: form.name.trim(), tagline: form.tagline.trim(), brand_color: form.brand_color, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("Settings saved");
    router.refresh();
  }

  return (
    <>
      <PageHeader title="Settings" description="How your agency appears to clients." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Branding" />
          <div className="space-y-4 p-5">
            <Field label="Agency name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} />
            </Field>
            <Field label="Tagline" hint="Shown on the sign-in page and the client portal footer.">
              <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} maxLength={100} />
            </Field>
            <Field label="Brand colour">
              <div className="flex items-center gap-3">
                <input type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} className="h-9 w-16 cursor-pointer rounded-md border border-zinc-300" />
                <Input value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} className="w-32 font-mono" />
              </div>
            </Field>
            <div className="flex justify-end">
              <Button onClick={save} loading={busy}>
                Save settings
              </Button>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Preview" description="What clients see at the top of their portal." />
          <BrandStyle color={form.brand_color}>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <BrandMark settings={{ ...settings, ...form }} />
              </div>
              <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Approve video</button>
              <p className="text-xs text-zinc-500">{form.tagline}</p>
            </div>
          </BrandStyle>
        </Card>
      </div>
    </>
  );
}
