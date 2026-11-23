"use client";

import Link from "next/link";
import { Inbox, Hourglass, Clapperboard, CheckCircle2, FileText, ArrowRight } from "lucide-react";
import { useLoad, useMe, useSupabase } from "@/components/Me";
import { loadActiveVideos, loadDirectory, loadPlans } from "@/lib/queries";
import { isManager, isOnMe, isWaitingOnClient } from "@/lib/workflow";
import { daysSince, firstOfMonthISO, fmtMonth } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, ErrorText, PageHeader, Spinner } from "@/components/ui";
import { ClientDot, VideoRow } from "@/components/bits";

export default function DashboardPage() {
  const supabase = useSupabase();
  const { profile } = useMe();
  const { data, loading, error } = useLoad(async () => {
    const [dir, videos, plans] = await Promise.all([loadDirectory(supabase), loadActiveVideos(supabase), loadPlans(supabase)]);
    return { ...dir, videos, plans };
  });

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorText>{error || "Could not load"}</ErrorText>;

  const { videos, clientMap, peopleMap, plans } = data;
  const manager = isManager(profile.role);
  const mine = videos.filter((v) => isOnMe(v, profile, clientMap.get(v.client_id)));
  const onClient = videos.filter(isWaitingOnClient);
  const inProduction = videos.filter((v) => v.stage !== "posted");
  const monthStart = firstOfMonthISO();
  const postedThisMonth = videos.filter((v) => v.stage === "posted" && v.stage_changed_at.slice(0, 10) >= monthStart);

  const managedClientIds = new Set(
    data.clients.filter((c) => profile.role === "owner" || c.account_manager_id === profile.id).map((c) => c.id)
  );
  const planTodos = manager
    ? plans.filter((p) => managedClientIds.has(p.client_id) && (p.status === "draft" || p.status === "changes_requested"))
    : [];
  const approvedNotStarted = manager
    ? plans.filter(
        (p) => managedClientIds.has(p.client_id) && p.status === "approved" && videos.some((v) => v.plan_id === p.id && v.stage === "planned")
      )
    : [];

  const firstName = profile.full_name.split(" ")[0];

  return (
    <>
      <PageHeader title={`Hi ${firstName}`} description="Here's everything that needs you today." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Inbox} label="Waiting on you" value={mine.length + planTodos.length + approvedNotStarted.length} highlight />
        <Stat icon={Hourglass} label="Waiting on clients" value={onClient.length} />
        <Stat icon={Clapperboard} label="In production" value={inProduction.length} />
        <Stat icon={CheckCircle2} label="Posted this month" value={postedThisMonth.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader title="Your next steps" description="Oldest first — these are holding up the pipeline." />
            {mine.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing waiting on you" description="When a video reaches one of your steps it will show up here." />
            ) : (
              <div className="divide-y divide-zinc-100">
                {mine.map((v) => (
                  <VideoRow key={v.id} video={v} client={clientMap.get(v.client_id)} people={peopleMap} href={`/videos/${v.id}`} />
                ))}
              </div>
            )}
          </Card>

          {manager && onClient.length > 0 && (
            <Card>
              <CardHeader title="Waiting on clients" description="Nudge anyone who has been sitting on a step for 3+ days." />
              <div className="divide-y divide-zinc-100">
                {onClient.map((v) => (
                  <VideoRow key={v.id} video={v} client={clientMap.get(v.client_id)} people={peopleMap} href={`/videos/${v.id}`} />
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          {manager && (
            <Card>
              <CardHeader title="Content plans" description="Monthly plans that need you." />
              {planTodos.length + approvedNotStarted.length === 0 ? (
                <EmptyState icon={FileText} title="All plans are on track" />
              ) : (
                <div className="divide-y divide-zinc-100">
                  {planTodos.map((p) => (
                    <PlanLink key={p.id} href={`/clients/${p.client_id}/plans/${p.id}`} title={p.title} month={p.month} client={clientMap.get(p.client_id)}>
                      {p.status === "draft" ? <Badge>Draft — send to client</Badge> : <Badge tone="red">Changes requested</Badge>}
                    </PlanLink>
                  ))}
                  {approvedNotStarted.map((p) => (
                    <PlanLink key={p.id} href={`/clients/${p.client_id}/plans/${p.id}`} title={p.title} month={p.month} client={clientMap.get(p.client_id)}>
                      <Badge tone="green">Approved — start scripts</Badge>
                    </PlanLink>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Stuck videos" description="In the same stage for 5+ days." />
            {(() => {
              const stuck = inProduction.filter((v) => daysSince(v.stage_changed_at) >= 5);
              if (!stuck.length) return <EmptyState title="Nothing is stuck" />;
              return (
                <div className="divide-y divide-zinc-100">
                  {stuck.slice(0, 8).map((v) => (
                    <VideoRow key={v.id} video={v} client={clientMap.get(v.client_id)} people={peopleMap} href={`/videos/${v.id}`} />
                  ))}
                </div>
              );
            })()}
          </Card>
        </div>
      </div>
    </>
  );
}

function Stat({ icon: Icon, label, value, highlight }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; highlight?: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-zinc-500">{label}</span>
        <Icon className={highlight ? "size-4 text-brand" : "size-4 text-zinc-400"} />
      </div>
      <div className={highlight && value > 0 ? "mt-2 text-3xl font-semibold text-brand" : "mt-2 text-3xl font-semibold text-zinc-900"}>{value}</div>
    </Card>
  );
}

function PlanLink({ href, title, month, client, children }: { href: string; title: string; month: string; client?: { name: string; brand_color: string }; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="mt-1 flex items-center gap-3">
          <ClientDot client={client} />
          <span className="text-xs text-zinc-400">{fmtMonth(month)}</span>
        </div>
      </div>
      {children}
      <ArrowRight className="size-4 text-zinc-300" />
    </Link>
  );
}
