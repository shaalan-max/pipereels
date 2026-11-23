"use client";

import { useState, type RefObject } from "react";
import { Lock, MessageSquare, Send, Clock3 } from "lucide-react";
import type { Comment, Profile } from "@/lib/types";
import { useMe, useSupabase } from "@/components/Me";
import { fmtTimecode, timeAgo } from "@/lib/format";
import { Avatar, Button, Textarea, cx, useToast } from "@/components/ui";

export function Discussion({ videoId, comments, people, playerRef, fileId, allowInternal, onPosted, title = "Comments", emptyText }: {
  videoId: string;
  comments: Comment[];
  people: Map<string, Profile>;
  playerRef?: RefObject<HTMLVideoElement | null>;
  fileId?: string | null;
  allowInternal?: boolean;
  onPosted: () => void;
  title?: string;
  emptyText?: string;
}) {
  const supabase = useSupabase();
  const { profile } = useMe();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pinTime, setPinTime] = useState(true);
  const hasPlayer = Boolean(playerRef);

  async function post() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const t = hasPlayer && pinTime && playerRef?.current ? playerRef.current.currentTime : null;
    const { error } = await supabase.from("comments").insert({
      video_id: videoId,
      author_id: profile.id,
      body: text,
      timecode: t,
      file_id: hasPlayer ? (fileId ?? null) : null,
      internal: allowInternal ? internal : false,
    });
    setBusy(false);
    if (error) return toast(error.message, "error");
    setBody("");
    onPosted();
  }

  function seek(t: number) {
    const el = playerRef?.current;
    if (!el) return;
    el.currentTime = t;
    el.play().catch(() => {});
  }

  const sorted = hasPlayer
    ? [...comments].sort((a, b) => (a.timecode ?? Infinity) - (b.timecode ?? Infinity) || a.created_at.localeCompare(b.created_at))
    : comments;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <MessageSquare className="size-4 text-zinc-400" /> {title}
        <span className="text-xs font-normal text-zinc-400">{comments.length}</span>
      </div>
      <div className="space-y-3">
        {sorted.length === 0 && <p className="text-[13px] text-zinc-500">{emptyText ?? "No comments yet."}</p>}
        {sorted.map((c) => {
          const author = c.author_id ? people.get(c.author_id) : undefined;
          const isClient = author?.role === "client";
          return (
            <div key={c.id} className={cx("flex gap-2.5 rounded-lg p-2.5", c.internal ? "bg-amber-50/70 ring-1 ring-amber-200/70" : "bg-zinc-50")}>
              <Avatar name={author?.full_name ?? "?"} size={26} color={isClient ? "#0f766e" : undefined} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 text-xs">
                  <span className="font-semibold text-zinc-900">{author?.full_name ?? "Former member"}</span>
                  {isClient && <span className="text-teal-700">Client</span>}
                  {c.internal && (
                    <span className="inline-flex items-center gap-0.5 text-amber-700">
                      <Lock className="size-3" /> Internal
                    </span>
                  )}
                  <span className="text-zinc-400">{timeAgo(c.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
                  {c.timecode !== null && (
                    <button
                      onClick={() => seek(Number(c.timecode))}
                      disabled={!hasPlayer}
                      className="mr-1.5 inline-flex items-center gap-0.5 rounded bg-brand-soft px-1.5 py-px font-mono text-[11px] font-semibold text-brand hover:underline disabled:no-underline"
                    >
                      <Clock3 className="size-3" />
                      {fmtTimecode(Number(c.timecode))}
                    </button>
                  )}
                  {c.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={hasPlayer ? "Pause the video where you want a change, then type here…" : "Write a comment…"}
          rows={2}
          className="min-h-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post();
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
            {hasPlayer && (
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={pinTime} onChange={(e) => setPinTime(e.target.checked)} className="accent-brand" />
                Pin to current time
              </label>
            )}
            {allowInternal && (
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-amber-600" />
                Internal (team only)
              </label>
            )}
          </div>
          <Button size="sm" icon={Send} onClick={post} loading={busy} disabled={!body.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
