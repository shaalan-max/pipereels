"use client";

import { useEffect, useState, type RefObject } from "react";
import { Download, Film, Play, Trash2, FileVideo } from "lucide-react";
import type { Profile, VideoFile } from "@/lib/types";
import { useMe, useSupabase } from "@/components/Me";
import { deleteVideoFile, isPlayable } from "@/lib/upload";
import { errorMessage, fmtBytes, timeAgo } from "@/lib/format";
import { Badge, cx, useToast } from "@/components/ui";

export function FileList({ files, urls, people, canDelete, onChanged, onPlay, playingId }: {
  files: VideoFile[];
  urls: Map<string, string>;
  people: Map<string, Profile>;
  canDelete?: (f: VideoFile) => boolean;
  onChanged: () => void;
  onPlay?: (f: VideoFile) => void;
  playingId?: string | null;
}) {
  const supabase = useSupabase();
  const toast = useToast();
  if (!files.length) return null;

  async function remove(f: VideoFile) {
    if (!confirm(`Delete "${f.file_name}"? This can't be undone.`)) return;
    try {
      await deleteVideoFile(supabase, f);
      toast("File deleted");
      onChanged();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  return (
    <ul className="divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-200">
      {files.map((f) => {
        const url = urls.get(f.storage_path);
        return (
          <li key={f.id} className={cx("flex items-center gap-3 px-3 py-2.5", playingId === f.id && "bg-brand-soft/50")}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
              <FileVideo className="size-4 text-zinc-500" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-medium text-zinc-900">{f.file_name}</span>
                {f.kind === "edit" && <Badge tone="brand">v{f.version}</Badge>}
              </div>
              <div className="text-xs text-zinc-500">
                {fmtBytes(f.size_bytes)} · {f.uploaded_by ? people.get(f.uploaded_by)?.full_name ?? "—" : "—"} · {timeAgo(f.created_at)}
              </div>
            </div>
            {onPlay && isPlayable(f) && url && (
              <button onClick={() => onPlay(f)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-brand" aria-label={`Play ${f.file_name}`}>
                <Play className="size-4" />
              </button>
            )}
            {url && (
              <a href={url} download={f.file_name} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" aria-label={`Download ${f.file_name}`}>
                <Download className="size-4" />
              </a>
            )}
            {canDelete?.(f) && (
              <button onClick={() => remove(f)} className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${f.file_name}`}>
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Player({ file, url, playerRef }: { file: VideoFile | undefined; url?: string; playerRef: RefObject<HTMLVideoElement | null> }) {
  if (!file || !url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-zinc-900 text-sm text-zinc-400">
        <Film className="mr-2 size-5" /> No video yet
      </div>
    );
  }
  if (!isPlayable(file)) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-zinc-900 text-sm text-zinc-400">
        This file type can&apos;t play in the browser — use download.
      </div>
    );
  }
  return (
    // vertical reels look best letterboxed in a dark frame
    <div className="overflow-hidden rounded-xl bg-black">
      <video ref={playerRef} key={url} src={url} controls playsInline preload="metadata" className="mx-auto max-h-[70vh] w-full" />
    </div>
  );
}

/** Pick which edit version is on screen (defaults to latest). */
export function useVersion(edits: VideoFile[]) {
  const latest = edits.length ? edits[edits.length - 1].id : null;
  const [selected, setSelected] = useState<string | null>(latest);
  useEffect(() => setSelected(latest), [latest]);
  return [edits.find((e) => e.id === selected) ?? edits[edits.length - 1], setSelected] as const;
}

export function useCanDelete() {
  const { profile } = useMe();
  return (f: VideoFile) => profile.role === "owner" || profile.role === "account_manager" || f.uploaded_by === profile.id;
}
