"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus, Clapperboard, FileText, KeyRound, Plus, Power, Trash2, UserPlus, X } from "lucide-react";
import { must, useLoad, useMe, useSupabase } from "@/components/Me";
import { loadActiveVideos, loadDirectory, loadPlans } from "@/lib/queries";
import { ROLE_LABEL, STAGES, isManager } from "@/lib/workflow";
import type { Client, Plan, Profile, Video } from "@/lib/types";
import { errorMessage, firstOfMonthISO, fmtMonth, toISODate } from "@/lib/format";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select, Spinner, Tabs, Textarea, useToast } from "@/components/ui";
import { CredentialsModal, PlatformPicker, VideoRow } from "@/components/bits";

type Tab = "pipeline" | "plans" | "logins" | "details";

export default function ClientPageWrapper() {
  return (
    <Suspense fallback={<Spinner />}>
      <ClientPage />
    </Suspense>
  );
}

function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const supabase = useSupabase();
  const { profile } = useMe();
  const tab = (search.get("tab") as Tab) || "pipeline";
  const setTab = (t: Tab) => router.replace(`/clients/${id}?tab=${t}`, { scroll: false });

  const { data, loading, error, reload } = useLoad(async () => {
    const [dir, videos, plans, team] = await Promise.all([
      loadDirectory(supabase),
      loadActiveVideos(supabase, id),
      loadPlans(supabase, id),
      supabase.from("client_team").select("profile_id").eq("client_id", id),
    ]);
    const client = dir.clientMap.get(id);
    if (!client) throw new Error("This client doesn't exist or you don't have access to it.");
    return { ...dir, client, videos, plans, teamIds: (must(team) as { profile_id: string }[]).map((t) => t.profile_id) };
  }, [id]);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorText>{error || "Could not load"}</ErrorText>;

  const { client } = data;
  const manager = isManager(profile.role);
  const clientUsers = data.people.filter((p) => p.client_id === id);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/clients" className="hover:text-zinc-800">
            Clients /
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <Avatar name={client.name} color={client.brand_color} size={36} />
            {client.name}
            {client.status !== "active" && <Badge tone="amber">{client.status}</Badge>}
          </span>
        }
        description={client.industry || undefined}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "pipeline", label: "Pipeline", count: data.videos.filter((v) => v.stage !== "posted").length },
          { value: "plans", label: "Monthly plans", count: data.plans.length },
          { value: "logins", label: "Logins & team" },
          { value: "details", label: "Details" },
        ]}
      />
      {tab === "pipeline" && <PipelineTab client={client} videos={data.videos} people={data.peopleMap} canAdd={manager} onAdded={reload} />}
      {tab === "plans" && <PlansTab client={client} plans={data.plans} videos={data.videos} canAdd={manager} />}
      {tab === "logins" && (
        <LoginsTab client={client} clientUsers={clientUsers} people={data.people} teamIds={data.teamIds} canManage={manager} onChange={reload} />
      )}
      {tab === "details" && <DetailsTab client={client} people={data.people} canEdit={manager} onSaved={reload} />}
    </>
  );
}

/* ---------------------------------------------------------------- pipeline */
function PipelineTab({ client, videos, people, canAdd, onAdded }: { client: Client; videos: Video[]; people: Map<string, Profile>; canAdd: boolean; onAdded: () => void }) {
  const [adding, setAdding] = useState(false);
  const groups = STAGES.map((s) => ({ stage: s, items: videos.filter((v) => v.stage === s.key) })).filter((g) => g.items.length);
  return (
    <div className="space-y-4">
      {canAdd && (
        <div className="flex justify-end">
          <Button variant="secondary" icon={Plus} onClick={() => setAdding(true)}>
            Add a one-off video
          </Button>
        </div>
      )}
      {groups.length === 0 && (
        <Card>
          <EmptyState icon={Clapperboard} title="No videos yet" description="Create a monthly plan to add this month's video ideas." />
        </Card>
      )}
      {groups.map((g) => (
        <Card key={g.stage.key}>
          <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3">
            <span className={`size-2 rounded-full ${g.stage.dot}`} />
            <span className="text-sm font-semibold">{g.stage.label}</span>
            <span className="text-xs text-zinc-400">{g.items.length}</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {g.items.map((v) => (
              <VideoRow key={v.id} video={v} people={people} href={`/videos/${v.id}`} />
            ))}
          </div>
        </Card>
      ))}
      {adding && <QuickVideoModal client={client} onClose={() => setAdding(false)} onSaved={onAdded} />}
    </div>
  );
}

function QuickVideoModal({ client, onClose, onSaved }: { client: Client; onClose: () => void; onSaved: () => void }) {
  const supabase = useSupabase();
  const { profile } = useMe();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (!title.trim()) return setError("Give the video a working title");
    setBusy(true);
    try {
      const v = must(
        await supabase.from("videos").insert({ client_id: client.id, title: title.trim(), platforms: client.platforms, created_by: profile.id }).select().single()
      ) as Video;
      onSaved();
      router.push(`/videos/${v.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="One-off video"
      description="For videos outside the monthly plan."
      footer={
        <Button onClick={save} loading={busy}>
          Create
        </Button>
      }
    >
      <Field label="Working title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="e.g. Open house this Saturday" />
      </Field>
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}

/* ---------------------------------------------------------------- plans */
const PLAN_BADGE: Record<Plan["status"], React.ReactNode> = {
  draft: <Badge>Draft</Badge>,
  sent: <Badge tone="amber">Waiting for client</Badge>,
  changes_requested: <Badge tone="red">Changes requested</Badge>,
  approved: <Badge tone="green">Approved</Badge>,
};

function PlansTab({ client, plans, videos, canAdd }: { client: Client; plans: Plan[]; videos: Video[]; canAdd: boolean }) {
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-4">
      {canAdd && (
        <div className="flex justify-end">
          <Button icon={CalendarPlus} onClick={() => setCreating(true)}>
            New monthly plan
          </Button>
        </div>
      )}
      <Card>
        {plans.length === 0 ? (
          <EmptyState icon={FileText} title="No plans yet" description="A monthly plan lists the video ideas for the month. The client approves it before scripting starts." />
        ) : (
          <div className="divide-y divide-zinc-100">
            {plans.map((p) => {
              const vids = videos.filter((v) => v.plan_id === p.id);
              const done = vids.filter((v) => v.stage === "posted").length;
              return (
                <Link key={p.id} href={`/clients/${client.id}/plans/${p.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{p.title}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {fmtMonth(p.month)} · {vids.length} videos · {done} posted
                    </div>
                  </div>
                  {PLAN_BADGE[p.status]}
                </Link>
              );
            })}
          </div>
        )}
      </Card>
      {creating && <NewPlanModal client={client} existing={plans} onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewPlanModal({ client, existing, onClose }: { client: Client; existing: Plan[]; onClose: () => void }) {
  const supabase = useSupabase();
  const { profile } = useMe();
  const router = useRouter();
  const now = new Date();
  const options = Array.from({ length: 4 }, (_, i) => toISODate(new Date(now.getFullYear(), now.getMonth() + i, 1))).filter(
    (m) => !existing.some((p) => p.month === m)
  );
  const [month, setMonth] = useState(options[options.length > 1 ? 1 : 0] ?? firstOfMonthISO());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    try {
      const label = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const p = must(
        await supabase.from("content_plans").insert({ client_id: client.id, month, title: `${label} content plan`, created_by: profile.id }).select().single()
      ) as Plan;
      router.push(`/clients/${client.id}/plans/${p.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New monthly plan"
      footer={
        <Button onClick={save} loading={busy} disabled={!options.length}>
          Create plan
        </Button>
      }
    >
      {options.length ? (
        <Field label="Month">
          <Select value={month} onChange={(e) => setMonth(e.target.value)}>
            {options.map((m) => (
              <option key={m} value={m}>
                {fmtMonth(m)}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <p className="text-sm text-zinc-500">Plans already exist for the next few months.</p>
      )}
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}

/* ---------------------------------------------------------------- logins & team */
function LoginsTab({ client, clientUsers, people, teamIds, canManage, onChange }: {
  client: Client;
  clientUsers: Profile[];
  people: Profile[];
  teamIds: string[];
  canManage: boolean;
  onChange: () => void;
}) {
  const supabase = useSupabase();
  const { settings } = useMe();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string; name?: string } | null>(null);
  const [pick, setPick] = useState("");
  const team = people.filter((p) => teamIds.includes(p.id));
  const am = client.account_manager_id ? people.find((p) => p.id === client.account_manager_id) : undefined;
  const assignable = people.filter((p) => p.role !== "client" && p.role !== "owner" && p.active && !teamIds.includes(p.id) && p.id !== client.account_manager_id);

  async function userAction(u: Profile, action: "deactivate" | "activate" | "reset_password") {
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return toast(json.error || "Failed", "error");
    if (action === "reset_password") setCreds({ email: json.email, password: json.password, name: u.full_name });
    else toast(action === "deactivate" ? "Login deactivated" : "Login re-activated");
    onChange();
  }

  async function addTeam() {
    if (!pick) return;
    const { error } = await supabase.from("client_team").insert({ client_id: client.id, profile_id: pick });
    if (error) return toast(error.message, "error");
    setPick("");
    onChange();
  }

  async function removeTeam(pid: string) {
    const { error } = await supabase.from("client_team").delete().eq("client_id", client.id).eq("profile_id", pid);
    if (error) return toast(error.message, "error");
    onChange();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="Client logins"
          description="People at the client who review scripts, upload footage and approve videos."
          action={canManage && <Button size="sm" icon={UserPlus} onClick={() => setAdding(true)}>Add login</Button>}
        />
        {clientUsers.length === 0 ? (
          <EmptyState title="No client logins yet" description="Add one so the client can approve plans, scripts and videos." />
        ) : (
          <div className="divide-y divide-zinc-100">
            {clientUsers.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Avatar name={u.full_name} color={client.brand_color} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {u.full_name} {!u.active && <Badge tone="red">Deactivated</Badge>}
                  </div>
                  <div className="truncate text-xs text-zinc-500">{u.email}</div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => userAction(u, "reset_password")} title="New temporary password">
                      Reset
                    </Button>
                    <Button size="sm" variant="ghost" icon={Power} onClick={() => userAction(u, u.active ? "deactivate" : "activate")}>
                      {u.active ? "Disable" : "Enable"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Agency team on this client" description="Scriptwriters and editors are added automatically when you assign them a video." />
        <div className="divide-y divide-zinc-100">
          <div className="flex items-center gap-3 px-5 py-3">
            <Avatar name={am?.full_name ?? "Owner"} size={32} />
            <div className="flex-1">
              <div className="text-sm font-medium">{am?.full_name ?? "Owner (no account manager set)"}</div>
              <div className="text-xs text-zinc-500">Account manager</div>
            </div>
          </div>
          {team.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={t.full_name} size={32} color="#71717a" />
              <div className="flex-1">
                <div className="text-sm font-medium">{t.full_name}</div>
                <div className="text-xs text-zinc-500">{ROLE_LABEL[t.role]}</div>
              </div>
              {canManage && (
                <button onClick={() => removeTeam(t.id)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600" aria-label={`Remove ${t.full_name}`}>
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {canManage && assignable.length > 0 && (
          <div className="flex gap-2 border-t border-zinc-100 px-5 py-3">
            <Select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Add a team member…</option>
              {assignable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} — {ROLE_LABEL[p.role]}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={addTeam} disabled={!pick}>
              Add
            </Button>
          </div>
        )}
      </Card>

      {adding && (
        <AddClientLoginModal
          client={client}
          onClose={() => setAdding(false)}
          onCreated={(c) => {
            setAdding(false);
            setCreds(c);
            onChange();
          }}
        />
      )}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} agencyName={settings.name} />
    </div>
  );
}

function AddClientLoginModal({ client, onClose, onCreated }: { client: Client; onClose: () => void; onCreated: (c: { email: string; password: string; name: string }) => void }) {
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "client", client_id: client.id, full_name, email }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error || "Could not create the login");
    onCreated({ email: json.email, password: json.password, name: full_name });
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={`Add a login for ${client.name}`}
      description="We'll generate a secure temporary password for you to send them."
      footer={
        <Button onClick={save} loading={busy}>
          Create login
        </Button>
      }
    >
      <Field label="Full name">
        <Input value={full_name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}

/* ---------------------------------------------------------------- details */
function DetailsTab({ client, people, canEdit, onSaved }: { client: Client; people: Profile[]; canEdit: boolean; onSaved: () => void }) {
  const supabase = useSupabase();
  const { profile } = useMe();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState(client);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");
  const managers = people.filter((p) => (p.role === "owner" || p.role === "account_manager") && p.active);

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("clients")
      .update({
        name: form.name.trim(),
        industry: form.industry,
        brand_color: form.brand_color,
        platforms: form.platforms,
        videos_per_month: form.videos_per_month,
        status: form.status,
        notes: form.notes,
        ...(profile.role === "owner" ? { account_manager_id: form.account_manager_id || null } : {}),
      })
      .eq("id", client.id);
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("Saved");
    onSaved();
  }

  async function remove() {
    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    if (error) return toast(error.message, "error");
    toast("Client deleted");
    router.push("/clients");
  }

  return (
    <Card className="p-5">
      <fieldset disabled={!canEdit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Industry">
            <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          </Field>
          <Field label="Account manager">
            <Select
              value={form.account_manager_id ?? ""}
              disabled={profile.role !== "owner"}
              onChange={(e) => setForm({ ...form, account_manager_id: e.target.value || null })}
            >
              <option value="">— Owner —</option>
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
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Client["status"] })}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <Field label="Brand colour">
            <input type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} className="h-9 w-16 cursor-pointer rounded-md border border-zinc-300" />
          </Field>
        </div>
        <Field label="Platforms">
          <PlatformPicker value={form.platforms} onChange={(platforms) => setForm({ ...form, platforms })} />
        </Field>
        <Field label="Internal notes" hint="Brand voice, do's and don'ts, contacts — only your team sees this.">
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </fieldset>
      {canEdit && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          {profile.role === "owner" ? (
            <Button variant="ghost" icon={Trash2} className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
              Delete client
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} loading={busy}>
            Save changes
          </Button>
        </div>
      )}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this client?"
        description="This permanently deletes the client, their logins, plans, videos, comments and files. It can't be undone. Consider archiving instead."
        footer={
          <Button variant="danger" disabled={typed.trim() !== client.name} onClick={remove}>
            Delete forever
          </Button>
        }
      >
        <Field label={`Type "${client.name}" to confirm`}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} />
        </Field>
      </Modal>
    </Card>
  );
}
