"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronDown, ExternalLink, Hourglass, MonitorPlay, Lightbulb } from "lucide-react";
import { useMe } from "@/components/Me";
import { useVideo, type VideoData } from "@/components/video/useVideo";
import { ActionPanel } from "@/components/video/ActionPanel";
import { Discussion } from "@/components/video/Discussion";
import { FileList, Player, useCanDelete } from "@/components/video/Media";
import { StageProgress, Timeline } from "@/components/video/Timeline";
import { Teleprompter } from "@/components/video/Teleprompter";
import { Uploader } from "@/components/video/Uploader";
import { STAGE } from "@/lib/workflow";
import { fmtDate } from "@/lib/format";
import { Button, Card, ErrorText, Spinner, StageBadge, cx } from "@/components/ui";
import { HelpVideo } from "@/components/HelpVideo";

export default function PortalVideoPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useVideo(id);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorText>{error || "Could not load"}</ErrorText>;
  return <ClientVideo data={data} reload={reload} />;
}

function ClientVideo({ data, reload }: { data: VideoData; reload: () => void }) {
  const { profile } = useMe();
  const { video, files, urls, comments, activity, peopleMap, client } = data;
  const [prompter, setPrompter] = useState(false);
  const playerRef = useRef<HTMLVideoElement>(null);
  const canDelete = useCanDelete();
  const stage = video.stage;
  const raws = files.filter((f) => f.kind === "raw");
  const edits = files.filter((f) => f.kind === "edit" && f.client_visible);
  const latestEdit = edits[edits.length - 1];
  const showScript = !["planned", "scripting"].includes(stage) && video.script.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="size-4" /> Home
        </Link>
        {stage === "script_review" && <HelpVideo key="script" id="script" title="Reviewing your script" description="How to approve a script or ask for changes." />}
        {stage === "shooting" && <HelpVideo key="shoot" id="shoot" title="Filming and uploading" description="Your shoot guide, the teleprompter, and uploading clips." />}
        {stage === "client_review" && <HelpVideo key="review" id="review" title="Reviewing your video" description="How to comment at an exact moment and approve your video." />}
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stage={stage} client />
          {video.post_date && (
            <span className="flex items-center gap-1 text-[13px] text-zinc-500">
              <CalendarDays className="size-3.5" /> Planned for {fmtDate(video.post_date, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{video.title}</h1>
        {video.concept && <p className="mt-1 text-zinc-600">{video.concept}</p>}
        <div className="mt-5">
          <StageProgress stage={stage} client />
        </div>
      </div>

      {/* ---------- script review ---------- */}
      {stage === "script_review" && (
        <>
          <Intro title="Your script is ready" text="Read it out loud once. If it sounds like you, approve it — or tell us what to change." />
          <ScriptCard script={video.script} hook={video.hook} onPrompter={() => setPrompter(true)} />
          {video.shoot_notes && <NotesCard notes={video.shoot_notes} />}
          <StickyActions>
            <ActionPanel video={video} role={profile.role} onDone={reload} clientMode />
          </StickyActions>
        </>
      )}

      {/* ---------- shooting ---------- */}
      {stage === "shooting" && (
        <>
          <Intro
            title="Time to film"
            text="Use the teleprompter to read your script while you record, follow the shooting notes, then upload your clips below. Upload every take — we'll pick the best."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Button size="lg" icon={MonitorPlay} onClick={() => setPrompter(true)} className="h-14 text-base">
              Open teleprompter
            </Button>
          </div>
          {video.shoot_notes && <NotesCard notes={video.shoot_notes} />}
          <ScriptCard script={video.script} hook={video.hook} onPrompter={() => setPrompter(true)} collapsible />
          <Card className="space-y-4 p-5">
            <h2 className="font-semibold">Upload your clips</h2>
            <Uploader clientId={client.id} videoId={video.id} kind="raw" onUploaded={reload} label="Upload video clips" big />
            <FileList files={raws} urls={urls} people={peopleMap} canDelete={canDelete} onChanged={reload} />
          </Card>
          {raws.length > 0 && (
            <StickyActions>
              <p className="text-sm text-zinc-600">
                {raws.length} clip{raws.length === 1 ? "" : "s"} uploaded. Finished?
              </p>
              <ActionPanel video={video} role={profile.role} onDone={reload} clientMode />
            </StickyActions>
          )}
        </>
      )}

      {/* ---------- client review ---------- */}
      {stage === "client_review" && (
        <>
          <Intro title="Your video is ready" text="Watch it through. To request a change, pause at that moment and leave a comment — or approve it if you're happy." />
          <Card className="space-y-4 p-4 sm:p-5">
            <Player file={latestEdit} url={latestEdit ? urls.get(latestEdit.storage_path) : undefined} playerRef={playerRef} />
            {latestEdit && (
              <Discussion
                title="Your comments"
                videoId={video.id}
                comments={comments.filter((c) => c.file_id === latestEdit.id)}
                people={peopleMap}
                playerRef={playerRef}
                fileId={latestEdit.id}
                onPosted={reload}
                emptyText="Pause the video and type a note — it will be linked to that exact moment."
              />
            )}
          </Card>
          <StickyActions>
            <ActionPanel video={video} role={profile.role} onDone={reload} clientMode />
          </StickyActions>
        </>
      )}

      {/* ---------- team is working ---------- */}
      {["planned", "scripting", "footage_check", "editing", "internal_review"].includes(stage) && (
        <Card className="flex items-start gap-4 p-5 sm:p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft">
            <Hourglass className="size-5 text-brand" />
          </span>
          <div>
            <h2 className="font-semibold">We&apos;re on it — {STAGE[stage].clientLabel.toLowerCase()}</h2>
            <p className="mt-1 text-sm text-zinc-600">Nothing needed from you right now. We&apos;ll notify you as soon as there&apos;s something to review.</p>
          </div>
        </Card>
      )}

      {/* ---------- approved / live ---------- */}
      {(stage === "scheduled" || stage === "posted") && (
        <>
          <Card className="flex items-start gap-4 p-5 sm:p-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="size-5 text-emerald-600" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{stage === "posted" ? "This video is live 🎉" : "Approved — we'll post it on schedule"}</h2>
              {stage === "scheduled" && video.post_date && <p className="mt-1 text-sm text-zinc-600">Planned for {fmtDate(video.post_date, { weekday: "long", month: "long", day: "numeric" })}.</p>}
              {video.posted_url && (
                <a href={video.posted_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                  View the post <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </Card>
          {latestEdit && (
            <Card className="p-4 sm:p-5">
              <Player file={latestEdit} url={urls.get(latestEdit.storage_path)} playerRef={playerRef} />
            </Card>
          )}
        </>
      )}

      {showScript && !["script_review", "shooting"].includes(stage) && <ScriptCard script={video.script} hook={video.hook} onPrompter={() => setPrompter(true)} collapsible />}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-5">
          <Discussion
            title="Messages with the team"
            videoId={video.id}
            comments={comments.filter((c) => !c.file_id)}
            people={peopleMap}
            onPosted={reload}
            emptyText="Questions about this video? Write to the team here."
          />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">History</h2>
          <Timeline items={activity} people={peopleMap} client />
        </Card>
      </div>

      {prompter && <Teleprompter script={video.script} onClose={() => setPrompter(false)} />}
    </div>
  );
}

function Intro({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-brand-soft p-5 ring-1 ring-brand/15">
      <h2 className="font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1 text-[15px] text-zinc-700">{text}</p>
    </div>
  );
}

function ScriptCard({ script, hook, onPrompter, collapsible }: { script: string; hook: string; onPrompter: () => void; collapsible?: boolean }) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <Card>
      <button onClick={() => collapsible && setOpen((o) => !o)} className={cx("flex w-full items-center justify-between px-5 py-4 text-left", !collapsible && "cursor-default")}>
        <span className="font-semibold">Script</span>
        {collapsible && <ChevronDown className={cx("size-5 text-zinc-400 transition", open && "rotate-180")} />}
      </button>
      {open && (
        <div className="border-t border-zinc-100 px-5 py-5">
          {hook && (
            <p className="mb-4 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              <span className="font-medium text-zinc-900">Opening hook:</span> {hook}
            </p>
          )}
          <div className="space-y-3 text-[17px] leading-relaxed text-zinc-800">
            {script.split("\n").map((l, i) => (l.trim() ? <p key={i}>{l}</p> : <div key={i} className="h-2" />))}
          </div>
          <div className="mt-5">
            <Button variant="secondary" icon={MonitorPlay} onClick={onPrompter}>
              Read in teleprompter
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function NotesCard({ notes }: { notes: string }) {
  return (
    <Card className="p-5">
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <Lightbulb className="size-4 text-amber-500" /> How to shoot it
      </h2>
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-700">{notes}</p>
    </Card>
  );
}

function StickyActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-4 z-20">
      <Card className="flex flex-col gap-3 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-end">{children}</Card>
    </div>
  );
}
