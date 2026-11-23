"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MonitorPlay, Save, Trash2, ExternalLink } from "lucide-react";
import { useMe, useSupabase } from "@/components/Me";
import { useVideo, type VideoData } from "@/components/video/useVideo";
import { ActionPanel } from "@/components/video/ActionPanel";
import { Discussion } from "@/components/video/Discussion";
import { FileList, Player, useCanDelete, useVersion } from "@/components/video/Media";
import { StageProgress, Timeline } from "@/components/video/Timeline";
import { Teleprompter } from "@/components/video/Teleprompter";
import { Uploader } from "@/components/video/Uploader";
import { PlatformPicker } from "@/components/bits";
import { ROLE_LABEL, STAGE, WAITING_LABEL, isManager, type ActionMeta } from "@/lib/workflow";
import type { Video } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Avatar, Button, Card, CardHeader, ErrorText, Field, Input, PageHeader, Select, Spinner, StageBadge, Textarea, useToast } from "@/components/ui";

const NEXT_STEP: Record<Video["stage"], string> = {
  planned: "This idea is in the plan. Start the script once the client approves the plan.",
  scripting: "Write the script and shooting notes below, then send them to the client.",
  script_review: "The client is reading the script. They'll approve it or ask for changes.",
  shooting: "The client is filming and uploading raw clips.",
  footage_check: "Check the raw clips. Approve them for editing or ask for a reshoot.",
  editing: "The editor is cutting the video. Upload the edit, then submit it for review.",
  internal_review: "Watch the edit. Send it back with notes, or send it to the client.",
  client_review: "The client is reviewing the video.",
  scheduled: "Approved. Post it on the planned date, then mark it as posted.",
  posted: "This video is live. 🎉",
};

type Editable = Pick<Video, "title" | "concept" | "hook" | "platforms" | "post_date" | "script" | "shoot_notes" | "caption" | "hashtags" | "posted_url">;
const pickEditable = (v: Video): Editable => ({
  title: v.title,
  concept: v.concept,
  hook: v.hook,
  platforms: v.platforms,
  post_date: v.post_date,
  script: v.script,
  shoot_notes: v.shoot_notes,
  caption: v.caption,
  hashtags: v.hashtags,
  posted_url: v.posted_url,
});

export default function VideoWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useVideo(id);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorText>{error || "Could not load"}</ErrorText>;
  return <Workspace data={data} reload={reload} />;
}

function Workspace({ data, reload }: { data: VideoData; reload: () => void }) {
  const supabase = useSupabase();
  const router = useRouter();
  const toast = useToast();
  const { profile } = useMe();
  const { video, client, files, urls, comments, activity, people, peopleMap, plan } = data;
  const [form, setForm] = useState<Editable>(pickEditable(video));
  const [saving, setSaving] = useState(false);
  const [prompter, setPrompter] = useState(false);
  const playerRef = useRef<HTMLVideoElement>(null);
  const canDelete = useCanDelete();
  const manager = isManager(profile.role);

  useEffect(() => setForm(pickEditable(video)), [video]);
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(pickEditable(video)), [form, video]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const raws = files.filter((f) => f.kind === "raw");
  const edits = files.filter((f) => f.kind === "edit");
  const [current, setCurrent] = useVersion(edits);
  const team = people.filter((p) => p.role !== "client" && p.active);
  const am = client.account_manager_id ? peopleMap.get(client.account_manager_id) : undefined;
  const words = form.script.trim() ? form.script.trim().split(/\s+/).length : 0;

  async function save() {
    if (!form.title.trim()) return toast("The title can't be empty", "error");
    setSaving(true);
    const { error } = await supabase
      .from("videos")
      .update({ ...form, title: form.title.trim(), post_date: form.post_date || null, posted_url: form.posted_url || null })
      .eq("id", video.id);
    setSaving(false);
    if (error) return toast(error.message, "error");
    toast("Saved");
    reload();
  }

  async function assign(field: "scriptwriter_id" | "editor_id", value: string) {
    const { error } = await supabase.from("videos").update({ [field]: value || null }).eq("id", video.id);
    if (error) return toast(error.message, "error");
    toast("Assignment updated");
    reload();
  }

  async function remove() {
    if (!confirm(`Delete "${video.title}" with all its files and comments? This can't be undone.`)) return;
    if (files.length) await supabase.storage.from("media").remove(files.map((f) => f.storage_path));
    const { error } = await supabase.from("videos").delete().eq("id", video.id);
    if (error) return toast(error.message, "error");
    toast("Video deleted");
    router.push(`/clients/${client.id}`);
  }

  const preflight = (a: ActionMeta): string | null => {
    if (dirty) return "You have unsaved changes — click Save first.";
    if (a.key === "send_script" && !video.script.trim()) return "Write the script before sending it to the client.";
    if (a.key === "send_to_client" && !edits.length) return "Upload the edited video first.";
    if (a.key === "approve_footage" && !raws.length) return "?There are no raw clips uploaded. Approve anyway?";
    return null;
  };

  const generalComments = comments.filter((c) => !c.file_id);
  const fileComments = comments.filter((c) => c.file_id && c.file_id === current?.id);

  return (
    <>
      <PageHeader
        eyebrow={
          <span>
            <Link href={`/clients/${client.id}`} className="hover:text-zinc-800">
              {client.name}
            </Link>
            {plan && (
              <>
                {" "}
                /{" "}
                <Link href={`/clients/${client.id}/plans/${plan.id}`} className="hover:text-zinc-800">
                  {plan.title}
                </Link>
              </>
            )}{" "}
            /
          </span>
        }
        title={video.title}
        actions={
          <>
            <StageBadge stage={video.stage} />
            {video.post_date && <span className="text-[13px] text-zinc-500">Post {fmtDate(video.post_date)}</span>}
          </>
        }
      />

      <Card className="mb-6 p-5">
        <StageProgress stage={video.stage} />
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">Waiting on: {WAITING_LABEL[STAGE[video.stage].waitingOn]}</div>
            <p className="mt-1 text-sm text-zinc-700">{NEXT_STEP[video.stage]}</p>
          </div>
          <ActionPanel video={video} role={profile.role} team={team} onDone={reload} preflight={preflight} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Brief" description="The client sees the title and concept." />
            <div className="space-y-4 p-5">
              <Field label="Title">
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Concept">
                <Textarea value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} rows={2} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Hook (first 3 seconds)">
                  <Input value={form.hook} onChange={(e) => setForm({ ...form, hook: e.target.value })} />
                </Field>
                <Field label="Planned post date">
                  <Input type="date" value={form.post_date ?? ""} onChange={(e) => setForm({ ...form, post_date: e.target.value || null })} />
                </Field>
              </div>
              <Field label="Platforms">
                <PlatformPicker value={form.platforms} onChange={(platforms) => setForm({ ...form, platforms })} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Script & shooting notes"
              description={`${words} words · about ${Math.max(1, Math.round(words / 2.5))}s on camera`}
              action={
                <Button size="sm" variant="secondary" icon={MonitorPlay} onClick={() => setPrompter(true)} disabled={!form.script.trim()}>
                  Teleprompter
                </Button>
              }
            />
            <div className="space-y-4 p-5">
              <Field label="Script (what the client says on camera)">
                <Textarea value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} rows={10} className="text-[15px]" placeholder="Write it the way they'd say it out loud. One idea per line." />
              </Field>
              <Field label="How to shoot it" hint="Location, framing, outfit, lighting, B-roll to capture, number of takes…">
                <Textarea
                  value={form.shoot_notes}
                  onChange={(e) => setForm({ ...form, shoot_notes: e.target.value })}
                  rows={6}
                  placeholder={"• Film vertical (9:16), phone at eye level\n• Face a window for light\n• B-roll: front door, kitchen, view from balcony\n• 2–3 takes of the hook"}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Raw footage" description={raws.length ? `${raws.length} clip(s) from the client` : "Clips the client uploads appear here."} />
            <div className="space-y-4 p-5">
              <FileList files={raws} urls={urls} people={peopleMap} canDelete={canDelete} onChanged={reload} />
              <Uploader clientId={client.id} videoId={video.id} kind="raw" onUploaded={reload} label="Upload raw clips" />
            </div>
          </Card>

          <Card>
            <CardHeader title="Edits & review" description="Each upload is a new version. Comments are pinned to the moment in the video." />
            <div className="space-y-4 p-5">
              <Player file={current} url={current ? urls.get(current.storage_path) : undefined} playerRef={playerRef} />
              {edits.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {edits.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setCurrent(e.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${e.id === current?.id ? "bg-brand text-white ring-brand" : "bg-white text-zinc-600 ring-zinc-300"}`}
                    >
                      v{e.version}
                      {e.client_visible ? " · sent" : ""}
                    </button>
                  ))}
                </div>
              )}
              <FileList files={edits} urls={urls} people={peopleMap} canDelete={canDelete} onChanged={reload} onPlay={(f) => setCurrent(f.id)} playingId={current?.id} />
              <Uploader clientId={client.id} videoId={video.id} kind="edit" onUploaded={reload} label="Upload edited video" multiple={false} />
              {current && (
                <div className="border-t border-zinc-100 pt-4">
                  <Discussion
                    title={`Notes on v${current.version}`}
                    videoId={video.id}
                    comments={fileComments}
                    people={peopleMap}
                    playerRef={playerRef}
                    fileId={current.id}
                    allowInternal
                    onPosted={reload}
                    emptyText="Pause the video and leave a note at that exact moment."
                  />
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Publishing" />
            <div className="space-y-4 p-5">
              <Field label="Caption">
                <Textarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} rows={4} />
              </Field>
              <Field label="Hashtags">
                <Input value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} placeholder="#realestate #cairo" />
              </Field>
              <Field label="Live post link">
                <div className="flex gap-2">
                  <Input type="url" value={form.posted_url ?? ""} onChange={(e) => setForm({ ...form, posted_url: e.target.value })} placeholder="https://" />
                  {video.posted_url && (
                    <a href={video.posted_url} target="_blank" rel="noreferrer" className="flex items-center rounded-lg px-3 text-brand ring-1 ring-zinc-300 hover:bg-zinc-50" aria-label="Open live post">
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </div>
              </Field>
            </div>
          </Card>

          {manager && (
            <div className="flex justify-end">
              <Button variant="ghost" icon={Trash2} className="text-red-600 hover:bg-red-50" onClick={remove}>
                Delete video
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="People" />
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Avatar name={am?.full_name ?? "Owner"} size={30} />
                <div>
                  <div className="text-sm font-medium">{am?.full_name ?? "Owner"}</div>
                  <div className="text-xs text-zinc-500">Account manager</div>
                </div>
              </div>
              <Field label="Scriptwriter">
                <Select value={video.scriptwriter_id ?? ""} disabled={!manager} onChange={(e) => assign("scriptwriter_id", e.target.value)}>
                  <option value="">Unassigned</option>
                  {team
                    .filter((p) => ["scriptwriter", "account_manager", "owner"].includes(p.role))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({ROLE_LABEL[p.role]})
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Editor">
                <Select value={video.editor_id ?? ""} disabled={!manager} onChange={(e) => assign("editor_id", e.target.value)}>
                  <option value="">Unassigned</option>
                  {team
                    .filter((p) => ["editor", "account_manager", "owner"].includes(p.role))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({ROLE_LABEL[p.role]})
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <Discussion videoId={video.id} comments={generalComments} people={peopleMap} allowInternal onPosted={reload} title="Discussion" />
          </Card>

          <Card>
            <CardHeader title="History" />
            <div className="p-5">
              <Timeline items={activity} people={peopleMap} />
            </div>
          </Card>
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 lg:pl-64">
          <div className="flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm text-white shadow-xl">
            Unsaved changes
            <Button size="sm" variant="secondary" onClick={() => setForm(pickEditable(video))}>
              Discard
            </Button>
            <Button size="sm" icon={Save} onClick={save} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      )}
      {prompter && <Teleprompter script={form.script} onClose={() => setPrompter(false)} />}
    </>
  );
}
