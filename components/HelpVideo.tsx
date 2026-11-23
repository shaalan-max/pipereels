"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { useMe, useSupabase } from "@/components/Me";
import { Button, Modal } from "@/components/ui";

export type HelpVideoId = "welcome" | "plan" | "script" | "shoot" | "review";

// Dismissed in this browser session (the server profile may still be the copy loaded with the page).
const dismissedThisSession = new Set<string>();

/**
 * A short explainer clip for one section of the portal.
 * Opens automatically the first time someone reaches the section; once they click
 * "I understand" it never opens by itself again. A small link lets them rewatch it.
 */
export function HelpVideo({ id, title, description }: { id: HelpVideoId; title: string; description: string }) {
  const { profile } = useMe();
  const supabase = useSupabase();
  const alreadySeen = (profile.onboarding_seen ?? []).includes(id) || dismissedThisSession.has(id);
  const [open, setOpen] = useState(!alreadySeen);
  const [saving, setSaving] = useState(false);

  async function understood() {
    setSaving(true);
    dismissedThisSession.add(id);
    await supabase.rpc("mark_onboarding_seen", { p_key: id });
    setSaving(false);
    setOpen(false);
  }

  function later() {
    // Closes for now; it opens again next time they visit this section.
    dismissedThisSession.add(id);
    setOpen(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-brand ring-1 ring-zinc-200 hover:ring-brand/40">
        <PlayCircle className="size-4" /> Watch help video
      </button>
      <Modal
        open={open}
        onClose={later}
        wide
        title={title}
        description={description}
        footer={
          <>
            <Button variant="secondary" onClick={later}>
              Watch later
            </Button>
            <Button onClick={understood} loading={saving}>
              I understand
            </Button>
          </>
        }
      >
        <div className="overflow-hidden rounded-xl bg-zinc-900">
          <video src={`/onboarding/${id}.mp4`} controls playsInline preload="metadata" className="aspect-video w-full" />
        </div>
      </Modal>
    </>
  );
}
