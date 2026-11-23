"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { must, useLoad, useMe, useSupabase } from "@/components/Me";
import { loadActiveVideos, loadDirectory } from "@/lib/queries";
import { isWaitingOnClient } from "@/lib/workflow";
import type { Client } from "@/lib/types";
import { Avatar, Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select, Spinner, useToast } from "@/components/ui";
import { PlatformPicker } from "@/components/bits";
import { errorMessage } from "@/lib/format";

export default function ClientsPage() {
  const supabase = useSupabase();
  const { profile } = useMe();
  const [showNew, setShowNew] = useState(false);
  const { data, loading, error } = useLoad(async () => {
    const [dir, videos] = await Promise.all([loadDirectory(supabase), loadActiveVideos(supabase)]);
    return { ...dir, videos };
  });

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorText>{error || "Could not load"}</ErrorText>;

  const active = data.clients.filter((c) => c.status !== "archived");
  const archived = data.clients.filter((c) => c.status === "archived");

  return (
    <>
      <PageHeader
        title="Clients"
        description={profile.role === "owner" ? "Every client workspace." : "Clients you work on."}
        actions={profile.role === "owner" && <Button icon={Plus} onClick={() => setShowNew(true)}>New client</Button>}
      />
      {active.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No clients yet"
            description={profile.role === "owner" ? "Add your first client to start planning their videos." : "Ask the owner to assign you to a client."}
            action={profile.role === "owner" && <Button icon={Plus} onClick={() => setShowNew(true)}>New client</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((c) => {
            const vids = data.videos.filter((v) => v.client_id === c.id);
            const inProd = vids.filter((v) => v.stage !== "posted").length;
            const waiting = vids.filter(isWaitingOnClient).length;
            const am = c.account_manager_id ? data.peopleMap.get(c.account_manager_id) : undefined;
            return (
              <Link key={c.id} href={`/clients/${c.id}`}>
                <Card className="h-full p-5 transition hover:ring-brand/40">
                  <div className="flex items-start gap-3">
                    <Avatar name={c.name} color={c.brand_color} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{c.name}</div>
                      <div className="truncate text-[13px] text-zinc-500">{c.industry || "—"}</div>
                    </div>
                    {c.status === "paused" && <Badge tone="amber">Paused</Badge>}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4 text-center">
                    <Mini label="In production" value={inProd} />
                    <Mini label="On client" value={waiting} warn={waiting > 0} />
                    <Mini label="Per month" value={c.videos_per_month} />
                  </div>
                  <div className="mt-4 text-xs text-zinc-500">Account manager: {am?.full_name ?? "—"}</div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      {archived.length > 0 && <p className="mt-6 text-xs text-zinc-400">{archived.length} archived client(s) hidden.</p>}
      {showNew && <NewClientModal managers={data.people.filter((p) => p.role === "owner" || p.role === "account_manager")} onClose={() => setShowNew(false)} />}
    </>
  );
}

function Mini({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <div className={warn ? "text-lg font-semibold text-amber-600" : "text-lg font-semibold"}>{value}</div>
      <div className="text-[11px] text-zinc-500">{label}</div>
    </div>
  );
}

function NewClientModal({ managers, onClose }: { managers: { id: string; full_name: string }[]; onClose: () => void }) {
  const supabase = useSupabase();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    industry: "",
    brand_color: "#4F46E5",
    platforms: ["instagram", "tiktok"],
    videos_per_month: 8,
    account_manager_id: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!form.name.trim()) return setError("Enter the client's business name");
    setBusy(true);
    setError("");
    try {
      const created = must(
        await supabase
          .from("clients")
          .insert({ ...form, name: form.name.trim(), account_manager_id: form.account_manager_id || null })
          .select()
          .single()
      ) as Client;
      toast("Client created");
      router.push(`/clients/${created.id}?tab=logins`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New client"
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Create client
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Realty" autoFocus />
        </Field>
        <Field label="Industry">
          <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Real estate" />
        </Field>
        <Field label="Account manager">
          <Select value={form.account_manager_id} onChange={(e) => setForm({ ...form, account_manager_id: e.target.value })}>
            <option value="">— Me / owner —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Videos per month">
          <Input type="number" min={0} max={200} value={form.videos_per_month} onChange={(e) => setForm({ ...form, videos_per_month: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Platforms">
        <PlatformPicker value={form.platforms} onChange={(platforms) => setForm({ ...form, platforms })} />
      </Field>
      <Field label="Brand colour">
        <input type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} className="h-9 w-16 cursor-pointer rounded-md border border-zinc-300" />
      </Field>
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}
