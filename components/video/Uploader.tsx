"use client";

import { useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import type { FileKind } from "@/lib/types";
import { useMe, useSupabase } from "@/components/Me";
import { uploadVideoFile } from "@/lib/upload";
import { MAX_UPLOAD_MB } from "@/lib/env";
import { errorMessage, fmtBytes } from "@/lib/format";
import { cx, useToast } from "@/components/ui";

export function Uploader({ clientId, videoId, kind, onUploaded, label, hint, multiple = true, big }: {
  clientId: string;
  videoId: string;
  kind: FileKind;
  onUploaded: () => void;
  label: string;
  hint?: string;
  multiple?: boolean;
  big?: boolean;
}) {
  const supabase = useSupabase();
  const { profile } = useMe();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<{ name: string; size: number; done: boolean }[]>([]);
  const [drag, setDrag] = useState(false);
  const busy = queue.some((q) => !q.done);

  async function handle(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setQueue(list.map((f) => ({ name: f.name, size: f.size, done: false })));
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      try {
        await uploadVideoFile(supabase, { clientId, videoId, file: list[i], kind, userId: profile.id });
        ok++;
      } catch (e) {
        toast(errorMessage(e), "error");
      }
      setQueue((q) => q.map((x, j) => (j === i ? { ...x, done: true } : x)));
    }
    if (ok) toast(ok === 1 ? "File uploaded" : `${ok} files uploaded`);
    setQueue([]);
    onUploaded();
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!busy) handle(e.dataTransfer.files);
      }}
      className={cx(
        "rounded-xl border-2 border-dashed text-center transition-colors",
        big ? "px-6 py-10" : "px-4 py-6",
        drag ? "border-brand bg-brand-soft" : "border-zinc-300 bg-zinc-50/50"
      )}
    >
      <input ref={input} type="file" accept="video/*,image/*,audio/*" multiple={multiple} className="hidden" onChange={(e) => e.target.files && handle(e.target.files)} />
      {busy ? (
        <div className="space-y-1 text-sm text-zinc-600">
          {queue.map((q) => (
            <div key={q.name} className="flex items-center justify-center gap-2">
              {q.done ? <span className="text-emerald-600">✓</span> : <Loader2 className="size-4 animate-spin text-brand" />}
              <span className="truncate">{q.name}</span>
              <span className="text-xs text-zinc-400">{fmtBytes(q.size)}</span>
            </div>
          ))}
          <p className="pt-1 text-xs text-zinc-400">Keep this page open until the upload finishes.</p>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} className="mx-auto flex flex-col items-center gap-2">
          <span className={cx("flex items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-zinc-200", big ? "size-14" : "size-10")}>
            <UploadCloud className={cx("text-brand", big ? "size-7" : "size-5")} />
          </span>
          <span className={cx("font-medium text-zinc-900", big ? "text-base" : "text-sm")}>{label}</span>
          <span className="text-xs text-zinc-500">{hint ?? `Tap to choose or drag files here · up to ${MAX_UPLOAD_MB} MB each`}</span>
        </button>
      )}
    </div>
  );
}
