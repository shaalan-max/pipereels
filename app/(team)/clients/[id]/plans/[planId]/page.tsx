"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Pencil, Plus, Send, Trash2, PenLine } from "lucide-react";
import { must, useLoad, useMe, useSupabase } from "@/components/Me";
import type { Client, Plan, Profile, Video } from "@/lib/types";
import { isManager } from "@/lib/workflow";
import { errorMessage, fmtDate, fmtMonth } from "@/lib/format";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select, Spinner, StageBadge, Textarea, useToast } from "@/components/ui";
import { PlatformList, PlatformPicker } from "@/components/bits";

export default function PlanPage() {
  const { id, planId } = useParams<{ id: string; planId: string }>();
  const supabase = useSupabase();
  const { profile } = useMe();
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<Video> | null>(null);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload, setData } = useLoad(async () => {
    const [plan, client, videos, people] = await Promise.all([
      supabase.from("content_plans").select("*").eq("id", planId).single(),
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("videos").select("*").eq("plan_id", planId).order("post_date", { ascending: true, nullsFirst: false }).order("sort_order"),
      supabase.from("profiles").select("*").neq("role", "client").eq("active", true).order("full_name"),
    ]);
    return { plan: must(plan) as Plan, client: must(client) as Client, videos: must(videos) as Video[], people: must(people) as Profile[] };
  }, [planId]);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorText>{error || "Could not load"}</ErrorText>;
  const { plan, client, videos } = data;
  const manager = isManager(profile.role);
  const editable = manager;

  async function savePlanFields() {
    const { error } = await supabase.from("content_plans").update({ title: plan.title, strategy: plan.strategy }).eq("id", plan.id);
    if (error) throw error;
  }

  async function saveAndToast() {
    setBusy(true);
    try {
      await savePlanFields();
      toast("Plan saved");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
    setBusy(false);
  }

  async function send() {
    setBusy(true);
    try {
      await savePlanFields();
      must(await supabase.rpc("plan_action", { p_plan: plan.id, p_action: "send" }));
      toast("Plan sent to the client");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
    setBusy(false);
  }

  async function removeVideo(v: Video) {
    if (!confirm(`Remove "${v.title}" from the plan?`)) return;
    const { error } = await supabase.from("videos").delete().eq("id", v.id);
    if (error) return toast(error.message, "error");
    reload();
  }

  async function deletePlan() {
    if (!confirm("Delete this draft plan and its video ideas?")) return;
    await supabase.from("videos").delete().eq("plan_id", plan.id).eq("stage", "planned");
    const { error } = await supabase.from("content_plans").delete().eq("id", plan.id);
    if (error) return toast(error.message, "error");
    router.push(`/clients/${client.id}?tab=plans`);
  }

  const planned = videos.filter((v) => v.stage === "planned");

  return (
    <>
      <PageHeader
        eyebrow={
          <span>
            <Link href="/clients" className="hover:text-zinc-800">
              Clients
            </Link>{" "}
            /{" "}
            <Link href={`/clients/${client.id}?tab=plans`} className="hover:text-zinc-800">
              {client.name}
            </Link>{" "}
            /
          </span>
        }
        title={plan.title}
        description={`${fmtMonth(plan.month)} · ${videos.length} of ${client.videos_per_month} videos planned`}
        actions={
          <>
            <PlanStatus status={plan.status} />
            {editable && (plan.status === "draft" || plan.status === "changes_requested") && (
              <Button icon={Send} onClick={send} loading={busy} disabled={!videos.length}>
                {plan.status === "draft" ? "Send to client" : "Re-send to client"}
              </Button>
            )}
            {editable && plan.status === "approved" && planned.length > 0 && (
              <Button icon={PenLine} onClick={() => setStarting(true)}>
                Start scripts ({planned.length})
              </Button>
            )}
          </>
        }
      />

      {plan.status === "changes_requested" && plan.client_feedback && (
        <div className="mb-6 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-semibold">The client asked for changes</div>
            <p className="mt-1 whitespace-pre-wrap">{plan.client_feedback}</p>
          </div>
        </div>
      )}
      {plan.status === "sent" && (
        <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Sent {fmtDate(plan.sent_at)} — waiting for the client to approve. You can still edit ideas.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 p-5 lg:col-span-1">
          <Field label="Plan title">
            <Input value={plan.title} disabled={!editable} onChange={(e) => setData({ ...data, plan: { ...plan, title: e.target.value } })} />
          </Field>
          <Field label="Strategy for the month" hint="The client sees this. Goals, themes, campaigns, offers.">
            <Textarea
              value={plan.strategy}
              disabled={!editable}
              rows={8}
              onChange={(e) => setData({ ...data, plan: { ...plan, strategy: e.target.value } })}
              placeholder="e.g. Focus on new listings in Maadi + 2 trust-building videos about the buying process."
            />
          </Field>
          {editable && (
            <div className="flex items-center justify-between">
              {plan.status === "draft" ? (
                <Button variant="ghost" size="sm" icon={Trash2} className="text-red-600 hover:bg-red-50" onClick={deletePlan}>
                  Delete plan
                </Button>
              ) : (
                <span />
              )}
              <Button variant="secondary" onClick={saveAndToast} loading={busy}>
                Save
              </Button>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Video ideas"
            description="Each idea becomes a video that moves through the pipeline."
            action={editable && <Button size="sm" icon={Plus} onClick={() => setEditing({ platforms: client.platforms })}>Add idea</Button>}
          />
          {videos.length === 0 ? (
            <EmptyState title="No ideas yet" description={`Aim for ${client.videos_per_month} this month.`} />
          ) : (
            <div className="divide-y divide-zinc-100">
              {videos.map((v, i) => (
                <div key={v.id} className="flex gap-4 px-5 py-4">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/videos/${v.id}`} className="font-medium hover:text-brand">
                        {v.title}
                      </Link>
                      {v.stage !== "planned" && <StageBadge stage={v.stage} />}
                    </div>
                    {v.concept && <p className="mt-1 text-sm text-zinc-600">{v.concept}</p>}
                    {v.hook && <p className="mt-1 text-[13px] text-zinc-500">Hook: “{v.hook}”</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span>Post: {fmtDate(v.post_date)}</span>
                      <span>
                        <PlatformList platforms={v.platforms} />
                      </span>
                    </div>
                  </div>
                  {editable && (
                    <div className="flex shrink-0 items-start gap-1">
                      <button onClick={() => setEditing(v)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Edit idea">
                        <Pencil className="size-4" />
                      </button>
                      {v.stage === "planned" && (
                        <button onClick={() => removeVideo(v)} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove idea">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {editing && <IdeaModal plan={plan} client={client} value={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {starting && (
        <StartScriptsModal
          videos={planned}
          writers={data.people.filter((p) => p.role === "scriptwriter" || p.role === "account_manager" || p.role === "owner")}
          onClose={() => setStarting(false)}
          onDone={() => {
            setStarting(false);
            reload();
          }}
        />
      )}
    </>
  );
}

function PlanStatus({ status }: { status: Plan["status"] }) {
  if (status === "draft") return <Badge>Draft</Badge>;
  if (status === "sent") return <Badge tone="amber">Waiting for client</Badge>;
  if (status === "changes_requested") return <Badge tone="red">Changes requested</Badge>;
  return <Badge tone="green">Approved</Badge>;
}

function IdeaModal({ plan, client, value, onClose, onSaved }: { plan: Plan; client: Client; value: Partial<Video>; onClose: () => void; onSaved: () => void }) {
  const supabase = useSupabase();
  const { profile } = useMe();
  const [form, setForm] = useState({
    title: value.title ?? "",
    concept: value.concept ?? "",
    hook: value.hook ?? "",
    post_date: value.post_date ?? "",
    platforms: value.platforms ?? client.platforms,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!form.title.trim()) return setError("Give the idea a title");
    setBusy(true);
    const payload = { ...form, title: form.title.trim(), post_date: form.post_date || null };
    const res = value.id
      ? await supabase.from("videos").update(payload).eq("id", value.id)
      : await supabase.from("videos").insert({ ...payload, client_id: client.id, plan_id: plan.id, created_by: profile.id });
    setBusy(false);
    if (res.error) return setError(res.error.message);
    onSaved();
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={value.id ? "Edit idea" : "New video idea"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save idea
          </Button>
        </>
      }
    >
      <Field label="Title">
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus placeholder="e.g. 3 mistakes first-time buyers make" />
      </Field>
      <Field label="Concept" hint="What the video is about, in a sentence or two. The client sees this in the plan.">
        <Textarea value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} rows={3} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hook (first 3 seconds)">
          <Input value={form.hook} onChange={(e) => setForm({ ...form, hook: e.target.value })} placeholder="e.g. Stop! Don't sign that contract yet…" />
        </Field>
        <Field label="Planned post date">
          <Input type="date" value={form.post_date} onChange={(e) => setForm({ ...form, post_date: e.target.value })} />
        </Field>
      </div>
      <Field label="Platforms">
        <PlatformPicker value={form.platforms} onChange={(platforms) => setForm({ ...form, platforms })} />
      </Field>
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}

function StartScriptsModal({ videos, writers, onClose, onDone }: { videos: Video[]; writers: Profile[]; onClose: () => void; onDone: () => void }) {
  const supabase = useSupabase();
  const toast = useToast();
  const [writer, setWriter] = useState(writers.find((w) => w.role === "scriptwriter")?.id ?? "");
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    let ok = 0;
    for (const v of videos) {
      const { error } = await supabase.rpc("advance_video", { p_video: v.id, p_action: "start_script", p_assignee: writer || null });
      if (error) toast(`${v.title}: ${error.message}`, "error");
      else ok++;
    }
    setBusy(false);
    toast(`${ok} script${ok === 1 ? "" : "s"} started`);
    onDone();
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={`Start ${videos.length} scripts`}
      description="Moves every planned idea to Scripting and notifies the scriptwriter."
      footer={
        <Button onClick={go} loading={busy}>
          Start scripts
        </Button>
      }
    >
      <Field label="Scriptwriter">
        <Select value={writer} onChange={(e) => setWriter(e.target.value)}>
          <option value="">Unassigned (account manager writes)</option>
          {writers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.full_name}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}
