"use client";

import type { Activity, Profile, Stage } from "@/lib/types";
import { STAGE } from "@/lib/workflow";
import { timeAgo } from "@/lib/format";
import { cx } from "@/components/ui";

const ACTION_TEXT: Record<string, string> = {
  start_script: "started the script",
  send_script: "sent the script to the client",
  approve_script: "approved the script",
  request_script_changes: "asked for script changes",
  submit_footage: "submitted the raw footage",
  approve_footage: "approved the footage",
  request_reshoot: "asked for a reshoot",
  submit_edit: "submitted an edit",
  request_edit_changes: "sent the edit back to the editor",
  send_to_client: "sent the video to the client",
  approve_video: "approved the video",
  request_video_changes: "asked for video changes",
  mark_posted: "marked it as posted",
  set_stage: "moved it",
};

export function Timeline({ items, people, client }: { items: Activity[]; people: Map<string, Profile>; client?: boolean }) {
  if (!items.length) return <p className="text-[13px] text-zinc-500">No activity yet.</p>;
  return (
    <ol className="relative space-y-4 border-l border-zinc-200 pl-4">
      {[...items].reverse().map((a) => {
        const who = a.actor_id ? people.get(a.actor_id)?.full_name ?? "Someone" : "System";
        const to = a.to_stage as Stage | null;
        return (
          <li key={a.id} className="relative">
            <span className={cx("absolute -left-[21px] top-1 size-2.5 rounded-full ring-2 ring-white", to ? STAGE[to].dot : "bg-zinc-300")} />
            <p className="text-[13px] text-zinc-700">
              <span className="font-medium text-zinc-900">{who}</span> {ACTION_TEXT[a.action] ?? a.action.replace(/_/g, " ")}
              {a.action === "set_stage" && to && <> to {client ? STAGE[to].clientLabel : STAGE[to].label}</>}
            </p>
            {a.note && <p className="mt-1 whitespace-pre-wrap rounded-md bg-zinc-50 px-2 py-1.5 text-xs text-zinc-600">“{a.note}”</p>}
            <p className="mt-0.5 text-[11px] text-zinc-400">{timeAgo(a.created_at)}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** Eight-step progress bar (plan → live). */
export function StageProgress({ stage, client }: { stage: Stage; client?: boolean }) {
  const steps = client
    ? ["Plan", "Script", "Shoot", "Footage", "Edit", "Check", "Review", "Live"]
    : ["Plan", "Script", "Shoot", "Footage", "Edit", "QA", "Client", "Publish"];
  const current = STAGE[stage].step;
  const done = stage === "posted";
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => {
        const n = i + 1;
        const state = done || n < current ? "done" : n === current ? "current" : "todo";
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className={cx("h-1.5 rounded-full", state === "done" ? "bg-brand" : state === "current" ? "bg-brand/50" : "bg-zinc-200")} />
            <span className={cx("hidden truncate text-[11px] sm:block", state === "todo" ? "text-zinc-400" : "font-medium text-zinc-700")}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
