"use client";

import Link from "next/link";
import { ArrowRight, Clapperboard, ExternalLink, FileText, Film, PenLine, Sparkles, Video as VideoIcon } from "lucide-react";
import { must, useLoad, useMe, useSupabase } from "@/components/Me";
import type { Client, Plan, Video } from "@/lib/types";
import { CLIENT_ACTION_STAGES } from "@/lib/workflow";
import { firstOfMonthISO, fmtDate, fmtMonth, toISODate } from "@/lib/format";
import { Card, EmptyState, ErrorText, Spinner, StageBadge } from "@/components/ui";
import { HelpVideo } from "@/components/HelpVideo";

const ACTION_COPY: Record<string, { title: string; cta: string; icon: React.ComponentType<{ className?: string }> }> = {
  script_review: { title: "Read and approve your script", cta: "Review script", icon: PenLine },
  shooting: { title: "Time to film — your shoot guide is ready", cta: "Open shoot guide", icon: Clapperboard },
  client_review: { title: "Your video is ready to watch", cta: "Watch & approve", icon: Film },
};

export default function PortalHome() {
  const supabase = useSupabase();
  const { profile } = useMe();
  const { data, loading, error } = useLoad(async () => {
    const [client, videos, plans] = await Promise.all([
      supabase.from("clients").select("*").eq("id", profile.client_id!).single(),
      supabase.from("videos").select("*").order("post_date", { ascending: true, nullsFirst: false }),
      supabase.from("content_plans").select("*").order("month", { ascending: false }),
    ]);
    return { client: must(client) as Client, videos: must(videos) as Video[], plans: must(plans) as Plan[] };
  });

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorText>{error || "Could not load"}</ErrorText>;
  const { client, videos, plans } = data;

  const planToReview = plans.filter((p) => p.status === "sent");
  const todo = videos.filter((v) => CLIENT_ACTION_STAGES.includes(v.stage));
  const inProgress = videos.filter((v) => !CLIENT_ACTION_STAGES.includes(v.stage) && v.stage !== "posted" && v.stage !== "planned");
  const live = videos.filter((v) => v.stage === "posted").sort((a, b) => b.stage_changed_at.localeCompare(a.stage_changed_at));

  const month = firstOfMonthISO();
  const nextMonth = toISODate(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1));
  const thisMonth = videos.filter((v) => v.post_date && v.post_date >= month && v.post_date < nextMonth);
  const liveThisMonth = thisMonth.filter((v) => v.stage === "posted").length;
  const target = Math.max(client.videos_per_month, thisMonth.length);
  const pct = target ? Math.round((liveThisMonth / target) * 100) : 0;
  const total = planToReview.length + todo.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Hi {profile.full_name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-zinc-500">
            {total === 0 ? "Nothing needs you right now — we're working on your videos." : `${total} thing${total === 1 ? "" : "s"} need${total === 1 ? "s" : ""} your attention.`}
          </p>
        </div>
        <HelpVideo id="welcome" title="Welcome to your portal" description="A 15-second tour of your home screen." />
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-zinc-500">{fmtMonth(month)}</div>
            <div className="mt-1 text-2xl font-semibold">
              {liveThisMonth} <span className="text-base font-normal text-zinc-500">of {target} videos live</span>
            </div>
          </div>
          <div className="text-sm text-zinc-500">{inProgress.length + todo.length} videos on the way</div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      {total > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Needs you</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {planToReview.map((p) => (
              <ActionCard key={p.id} href={`/portal/plans/${p.id}`} icon={FileText} title={`Approve your ${fmtMonth(p.month)} plan`} subtitle={p.title} cta="Review plan" />
            ))}
            {todo.map((v) => {
              const c = ACTION_COPY[v.stage];
              return <ActionCard key={v.id} href={`/portal/videos/${v.id}`} icon={c.icon} title={c.title} subtitle={v.title} cta={c.cta} />;
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">In production</h2>
        <Card>
          {inProgress.length === 0 ? (
            <EmptyState icon={Sparkles} title="Nothing in production right now" />
          ) : (
            <div className="divide-y divide-zinc-100">
              {inProgress.map((v) => (
                <Link key={v.id} href={`/portal/videos/${v.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50">
                  <VideoIcon className="size-4 shrink-0 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{v.title}</div>
                    {v.post_date && <div className="text-xs text-zinc-500">Planned for {fmtDate(v.post_date, { weekday: "short", month: "short", day: "numeric" })}</div>}
                  </div>
                  <StageBadge stage={v.stage} client />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </section>

      {live.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Live</h2>
          <Card>
            <div className="divide-y divide-zinc-100">
              {live.slice(0, 10).map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-5 py-3.5">
                  <Link href={`/portal/videos/${v.id}`} className="min-w-0 flex-1 hover:text-brand">
                    <div className="truncate text-sm font-medium">{v.title}</div>
                    <div className="text-xs text-zinc-500">Posted {fmtDate(v.stage_changed_at)}</div>
                  </Link>
                  {v.posted_url && (
                    <a href={v.posted_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
                      View <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {plans.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Monthly plans</h2>
          <div className="flex flex-wrap gap-2">
            {plans.map((p) => (
              <Link key={p.id} href={`/portal/plans/${p.id}`} className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-zinc-200 hover:ring-brand/40">
                {fmtMonth(p.month)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ActionCard({ href, icon: Icon, title, subtitle, cta }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; cta: string }) {
  return (
    <Link href={href}>
      <Card className="group flex h-full flex-col p-5 ring-brand/30 transition hover:ring-2">
        <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-brand-soft">
          <Icon className="size-5 text-brand" />
        </span>
        <div className="font-semibold text-zinc-900">{title}</div>
        <div className="mt-0.5 line-clamp-2 text-sm text-zinc-500">{subtitle}</div>
        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-brand">
          {cta} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}
