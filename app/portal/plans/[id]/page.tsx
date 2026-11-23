"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2 } from "lucide-react";
import { must, useLoad, useSupabase } from "@/components/Me";
import type { Plan, Video } from "@/lib/types";
import { fmtDate, fmtMonth } from "@/lib/format";
import { Badge, Button, Card, ErrorText, Field, Modal, Spinner, StageBadge, Textarea, useToast } from "@/components/ui";
import { PlatformList } from "@/components/bits";
import { HelpVideo } from "@/components/HelpVideo";

export default function PortalPlanPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = useSupabase();
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { data, loading, error, reload } = useLoad(async () => {
    const [plan, videos] = await Promise.all([
      supabase.from("content_plans").select("*").eq("id", id).maybeSingle(),
      supabase.from("videos").select("*").eq("plan_id", id).order("post_date", { ascending: true, nullsFirst: false }).order("sort_order"),
    ]);
    const p = must(plan) as Plan | null;
    if (!p) throw new Error("This plan isn't available.");
    return { plan: p, videos: must(videos) as Video[] };
  }, [id]);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorText>{error || "Could not load"}</ErrorText>;
  const { plan, videos } = data;

  async function act(action: "approve" | "request_changes") {
    setBusy(true);
    setErr("");
    const { error } = await supabase.rpc("plan_action", { p_plan: plan.id, p_action: action, p_note: action === "request_changes" ? note : null });
    setBusy(false);
    if (error) return action === "request_changes" ? setErr(error.message) : toast(error.message, "error");
    toast(action === "approve" ? "Plan approved — we'll start writing scripts" : "Thanks — we'll update the plan");
    setAsking(false);
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="size-4" /> Home
        </Link>
        <HelpVideo id="plan" title="Your monthly plan" description="How to review and approve this month's video ideas." />
      </div>
      <div>
        <div className="text-[13px] font-medium text-zinc-500">{fmtMonth(plan.month)}</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{plan.title}</h1>
        <div className="mt-2">
          {plan.status === "approved" ? (
            <Badge tone="green">
              <CheckCircle2 className="size-3" /> Approved {fmtDate(plan.approved_at)}
            </Badge>
          ) : plan.status === "changes_requested" ? (
            <Badge tone="amber">We&apos;re updating this plan based on your feedback</Badge>
          ) : (
            <Badge tone="brand">Waiting for your approval</Badge>
          )}
        </div>
      </div>

      {plan.strategy && (
        <Card className="p-5 sm:p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">The plan for this month</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-zinc-700">{plan.strategy}</p>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">{videos.length} video idea{videos.length === 1 ? "" : "s"}</h2>
        <div className="space-y-3">
          {videos.map((v, i) => (
            <Card key={v.id} className="p-5">
              <div className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{v.title}</h3>
                    {v.stage !== "planned" && <StageBadge stage={v.stage} client />}
                  </div>
                  {v.concept && <p className="mt-1 text-[15px] leading-relaxed text-zinc-600">{v.concept}</p>}
                  {v.hook && <p className="mt-2 text-sm italic text-zinc-500">Opens with: “{v.hook}”</p>}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    {v.post_date && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3.5" /> {fmtDate(v.post_date, { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    )}
                    <span>
                      <PlatformList platforms={v.platforms} />
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {plan.status === "sent" && (
        <div className="sticky bottom-4 z-20">
          <Card className="flex flex-col gap-3 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-600">Happy with these ideas?</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="lg" className="flex-1 sm:flex-none" onClick={() => setAsking(true)}>
                Ask for changes
              </Button>
              <Button size="lg" className="flex-1 sm:flex-none" onClick={() => act("approve")} loading={busy && !asking}>
                Approve plan
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={asking}
        onClose={() => setAsking(false)}
        title="What would you like to change?"
        footer={
          <Button onClick={() => act("request_changes")} loading={busy}>
            Send feedback
          </Button>
        }
      >
        <Field label="Your feedback">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} autoFocus placeholder="e.g. Swap idea 3 for something about our new offer…" />
        </Field>
        <ErrorText>{err}</ErrorText>
      </Modal>
    </div>
  );
}
