"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, CalendarDays, Clock } from "lucide-react";
import type { Client, Profile, Video } from "@/lib/types";
import { PLATFORMS, PLATFORM_LABEL, STAGE } from "@/lib/workflow";
import { daysSince, fmtDate, todayISO } from "@/lib/format";
import { Avatar, Button, Modal, StageBadge, cx } from "@/components/ui";

export function ClientDot({ client }: { client?: Pick<Client, "name" | "brand_color"> }) {
  if (!client) return null;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-zinc-500">
      <span className="size-2 shrink-0 rounded-full" style={{ background: client.brand_color }} />
      <span className="truncate">{client.name}</span>
    </span>
  );
}

export function DaysInStage({ video }: { video: Video }) {
  const d = daysSince(video.stage_changed_at);
  if (video.stage === "posted") return null;
  const tone = d >= 5 ? "text-red-600" : d >= 3 ? "text-amber-600" : "text-zinc-400";
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs", tone)} title="Days in this stage">
      <Clock className="size-3" />
      {d === 0 ? "today" : `${d}d`}
    </span>
  );
}

export function PostDate({ date }: { date: string | null }) {
  if (!date) return null;
  const overdue = date < todayISO();
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs", overdue ? "font-medium text-red-600" : "text-zinc-500")} title="Planned post date">
      <CalendarDays className="size-3" />
      {fmtDate(date)}
    </span>
  );
}

export function VideoRow({ video, client, people, href }: { video: Video; client?: Client; people?: Map<string, Profile>; href: string }) {
  const assignee =
    video.stage === "scripting" && video.scriptwriter_id
      ? people?.get(video.scriptwriter_id)
      : video.stage === "editing" && video.editor_id
        ? people?.get(video.editor_id)
        : undefined;
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-900">{video.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <ClientDot client={client} />
          <PostDate date={video.post_date} />
          <DaysInStage video={video} />
        </div>
      </div>
      {assignee && <Avatar name={assignee.full_name} size={24} color="#71717a" />}
      <StageBadge stage={video.stage} />
    </Link>
  );
}

export function PlatformPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PLATFORMS.map((p) => {
        const on = value.includes(p);
        return (
          <button
            type="button"
            key={p}
            onClick={() => onChange(on ? value.filter((x) => x !== p) : [...value, p])}
            className={cx(
              "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
              on ? "bg-brand text-white ring-brand" : "bg-white text-zinc-600 ring-zinc-300 hover:bg-zinc-50"
            )}
          >
            {PLATFORM_LABEL[p]}
          </button>
        );
      })}
    </div>
  );
}

export function PlatformList({ platforms }: { platforms: string[] }) {
  if (!platforms.length) return <span className="text-zinc-400">—</span>;
  return <>{platforms.map((p) => PLATFORM_LABEL[p] ?? p).join(", ")}</>;
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      icon={done ? Check : Copy}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copied" : label}
    </Button>
  );
}

/** Shown once after creating a login or resetting a password — the password is not stored anywhere. */
export function CredentialsModal({ creds, onClose, agencyName }: { creds: { email: string; password: string; name?: string } | null; onClose: () => void; agencyName: string }) {
  if (!creds) return null;
  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
  const message = `Hi${creds.name ? " " + creds.name.split(" ")[0] : ""},\n\nYour ${agencyName} portal is ready.\n\nSign in: ${loginUrl}\nEmail: ${creds.email}\nTemporary password: ${creds.password}\n\nPlease change your password after signing in (account menu → Change password).`;
  return (
    <Modal open onClose={onClose} title="Login ready" description="Copy these now — the password won't be shown again." footer={<Button onClick={onClose}>Done</Button>}>
      <div className="space-y-2 rounded-lg bg-zinc-50 p-4 text-sm ring-1 ring-zinc-200">
        <div className="flex justify-between gap-3">
          <span className="text-zinc-500">Email</span>
          <span className="font-medium">{creds.email}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-zinc-500">Temporary password</span>
          <code className="font-mono font-semibold">{creds.password}</code>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={creds.password} label="Copy password" />
        <CopyButton text={message} label="Copy welcome message" />
      </div>
      <p className="text-xs text-zinc-500">Send the welcome message by WhatsApp or email. They can change the password after signing in.</p>
    </Modal>
  );
}

export function stageCounts(videos: Video[]) {
  const m = new Map<string, number>();
  videos.forEach((v) => m.set(v.stage, (m.get(v.stage) ?? 0) + 1));
  return m;
}

export function waitingLabel(video: Video) {
  return STAGE[video.stage].waitingOn;
}
