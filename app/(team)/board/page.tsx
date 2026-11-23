"use client";

import Link from "next/link";
import { useState } from "react";
import { useLoad, useMe, useSupabase } from "@/components/Me";
import { loadActiveVideos, loadDirectory } from "@/lib/queries";
import { STAGES, WAITING_LABEL, isOnMe } from "@/lib/workflow";
import { daysSince } from "@/lib/format";
import { Avatar, ErrorText, PageHeader, Select, Spinner, cx } from "@/components/ui";
import { ClientDot, DaysInStage, PostDate } from "@/components/bits";

export default function BoardPage() {
  const supabase = useSupabase();
  const { profile } = useMe();
  const [clientFilter, setClientFilter] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [hidePosted, setHidePosted] = useState(true);
  const { data, loading, error } = useLoad(async () => {
    const [dir, videos] = await Promise.all([loadDirectory(supabase), loadActiveVideos(supabase)]);
    return { ...dir, videos };
  });

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorText>{error || "Could not load"}</ErrorText>;

  let videos = data.videos;
  if (clientFilter !== "all") videos = videos.filter((v) => v.client_id === clientFilter);
  if (onlyMine) videos = videos.filter((v) => isOnMe(v, profile, data.clientMap.get(v.client_id)));
  if (hidePosted) videos = videos.filter((v) => v.stage !== "posted" || daysSince(v.stage_changed_at) <= 7);

  return (
    <>
      <PageHeader
        title="Production board"
        description="Every video, by stage. Open a video to move it forward."
        actions={
          <>
            <div className="w-56">
            <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
              <option value="all">All clients</option>
              {data.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            </div>
            <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-zinc-300">
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="accent-brand" />
              Waiting on me
            </label>
            <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-zinc-300">
              <input type="checkbox" checked={hidePosted} onChange={(e) => setHidePosted(e.target.checked)} className="accent-brand" />
              Hide old posts
            </label>
          </>
        }
      />

      <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex gap-3" style={{ minWidth: STAGES.length * 252 }}>
          {STAGES.map((s) => {
            const col = videos.filter((v) => v.stage === s.key);
            return (
              <div key={s.key} className="w-60 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cx("size-2 rounded-full", s.dot)} />
                    <span className="text-[13px] font-semibold text-zinc-800">{s.label}</span>
                    <span className="rounded-full bg-zinc-200/70 px-1.5 text-[11px] font-medium text-zinc-600">{col.length}</span>
                  </div>
                </div>
                <div className="mb-2 px-1 text-[11px] text-zinc-400">Waiting on: {WAITING_LABEL[s.waitingOn]}</div>
                <div className="flex min-h-24 flex-col gap-2 rounded-xl bg-zinc-100/70 p-2">
                  {col.map((v) => {
                    const assignee = v.stage === "scripting" ? v.scriptwriter_id : v.stage === "editing" ? v.editor_id : null;
                    const person = assignee ? data.peopleMap.get(assignee) : undefined;
                    return (
                      <Link key={v.id} href={`/videos/${v.id}`} className="block rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 transition hover:ring-brand/50">
                        <div className="line-clamp-2 text-[13px] font-medium text-zinc-900">{v.title}</div>
                        <div className="mt-2">
                          <ClientDot client={data.clientMap.get(v.client_id)} />
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <PostDate date={v.post_date} />
                            <DaysInStage video={v} />
                          </div>
                          {person && <Avatar name={person.full_name} size={20} color="#71717a" />}
                        </div>
                      </Link>
                    );
                  })}
                  {col.length === 0 && <div className="py-6 text-center text-xs text-zinc-400">Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
