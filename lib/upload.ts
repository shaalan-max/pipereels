import type { SupabaseClient } from "@supabase/supabase-js";
import type { FileKind, VideoFile } from "@/lib/types";
import { MAX_UPLOAD_MB } from "@/lib/env";
import { fmtBytes } from "@/lib/format";

export const BUCKET = "media";

export function checkSize(file: File) {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(
      `"${file.name}" is ${fmtBytes(file.size)}. The current limit is ${MAX_UPLOAD_MB} MB per file — export a smaller/compressed version or split the clip.`
    );
  }
}

/** Uploads to private storage at {client}/{video}/{uuid}-{name}, then records it in video_files. */
export async function uploadVideoFile(
  supabase: SupabaseClient,
  opts: { clientId: string; videoId: string; file: File; kind: FileKind; userId: string }
) {
  checkSize(opts.file);
  const safe = opts.file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `${opts.clientId}/${opts.videoId}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from(BUCKET).upload(path, opts.file, { contentType: opts.file.type || undefined, upsert: false });
  if (up.error) {
    const msg = /exceeded|too large|maximum/i.test(up.error.message)
      ? `"${opts.file.name}" is larger than the storage limit (${MAX_UPLOAD_MB} MB).`
      : up.error.message;
    throw new Error(msg);
  }
  const ins = await supabase.from("video_files").insert({
    video_id: opts.videoId,
    client_id: opts.clientId,
    kind: opts.kind,
    storage_path: path,
    file_name: opts.file.name,
    size_bytes: opts.file.size,
    mime_type: opts.file.type || "",
    uploaded_by: opts.userId,
  });
  if (ins.error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(ins.error.message);
  }
}

// Signed links are cached so refreshing page data (e.g. after a comment) doesn't
// swap the video's URL and restart the player. Links last 3h; reuse them for 2h.
const urlCache = new Map<string, { url: string; at: number }>();
const REUSE_MS = 2 * 60 * 60 * 1000;

export async function signedUrls(supabase: SupabaseClient, files: VideoFile[]) {
  const m = new Map<string, string>();
  const now = Date.now();
  const missing: string[] = [];
  for (const f of files) {
    const hit = urlCache.get(f.storage_path);
    if (hit && now - hit.at < REUSE_MS) m.set(f.storage_path, hit.url);
    else missing.push(f.storage_path);
  }
  if (missing.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(missing, 60 * 60 * 3);
    for (const d of data || []) {
      if (d.path && d.signedUrl) {
        m.set(d.path, d.signedUrl);
        urlCache.set(d.path, { url: d.signedUrl, at: now });
      }
    }
  }
  return m;
}

export async function deleteVideoFile(supabase: SupabaseClient, f: VideoFile) {
  const { error } = await supabase.from("video_files").delete().eq("id", f.id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(BUCKET).remove([f.storage_path]);
}

export function isPlayable(f: Pick<VideoFile, "mime_type" | "file_name">) {
  return f.mime_type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(f.file_name);
}
