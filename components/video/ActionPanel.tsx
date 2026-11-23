"use client";

import { useState } from "react";
import { ArrowRight, MoveRight } from "lucide-react";
import type { Profile, Role, Stage, Video } from "@/lib/types";
import { STAGES, actionsFor, isManager, type ActionMeta } from "@/lib/workflow";
import { useSupabase } from "@/components/Me";
import { Button, ErrorText, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";

export function ActionPanel({ video, role, team, onDone, clientMode, preflight }: {
  video: Video;
  role: Role;
  team?: Profile[];
  onDone: () => void;
  clientMode?: boolean;
  /** Return an error message to block an action, or a warning prefixed with "?" to ask for confirmation. */
  preflight?: (a: ActionMeta) => string | null;
}) {
  const supabase = useSupabase();
  const toast = useToast();
  const [active, setActive] = useState<ActionMeta | null>(null);
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [moving, setMoving] = useState(false);
  const [moveTo, setMoveTo] = useState<Stage>(video.stage);

  const actions = actionsFor(video.stage, role).filter((a) => !clientMode || a.roles.includes("client"));

  async function run(a: ActionMeta, extra: { note?: string; assignee?: string; url?: string } = {}) {
    setBusy(true);
    setError("");
    const { error } = await supabase.rpc("advance_video", {
      p_video: video.id,
      p_action: a.key,
      p_note: extra.note || null,
      p_assignee: extra.assignee || null,
      p_url: extra.url || null,
    });
    setBusy(false);
    if (error) {
      if (active) setError(error.message);
      else toast(error.message, "error");
      return;
    }
    toast(clientMode ? "Thanks — we're on it!" : "Done");
    setActive(null);
    setNote("");
    setUrl("");
    onDone();
  }

  function start(a: ActionMeta) {
    const check = preflight?.(a);
    if (check && !check.startsWith("?")) return toast(check, "error");
    if (check && !confirm(check.slice(1))) return;
    if (a.needsNote || a.assign || a.needsUrl) {
      setError("");
      setAssignee(a.assign === "scriptwriter" ? video.scriptwriter_id ?? "" : a.assign === "editor" ? video.editor_id ?? "" : "");
      setActive(a);
    } else {
      run(a);
    }
  }

  async function move() {
    setBusy(true);
    const { error } = await supabase.rpc("advance_video", { p_video: video.id, p_action: "set_stage", p_stage: moveTo });
    setBusy(false);
    if (error) return toast(error.message, "error");
    setMoving(false);
    toast("Stage changed");
    onDone();
  }

  const assignOptions = (team ?? []).filter((p) =>
    active?.assign === "scriptwriter" ? ["scriptwriter", "account_manager", "owner"].includes(p.role) : ["editor", "account_manager", "owner"].includes(p.role)
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.key}
            variant={a.primary ? "primary" : "secondary"}
            size={clientMode ? "lg" : "md"}
            icon={a.primary ? ArrowRight : undefined}
            onClick={() => start(a)}
            loading={busy && !active && !moving}
            className={clientMode ? "flex-1 sm:flex-none" : undefined}
          >
            {clientMode ? a.clientLabel ?? a.label : a.onBehalf && role !== "client" ? `${a.label} (for client)` : a.label}
          </Button>
        ))}
        {!clientMode && isManager(role) && (
          <Button variant="ghost" icon={MoveRight} onClick={() => setMoving(true)}>
            Move…
          </Button>
        )}
      </div>

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active ? (clientMode ? active.clientLabel ?? active.label : active.label) : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setActive(null)}>
              Cancel
            </Button>
            <Button onClick={() => active && run(active, { note, assignee, url })} loading={busy}>
              Confirm
            </Button>
          </>
        }
      >
        {active?.assign && (
          <Field label={active.assign === "scriptwriter" ? "Who writes the script?" : "Which editor?"}>
            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">{active.assign === "scriptwriter" ? "Unassigned — account manager writes it" : "Unassigned — account manager handles it"}</option>
              {assignOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {active?.needsNote && (
          <Field label={active.notePrompt ?? "Note"}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} autoFocus rows={4} />
          </Field>
        )}
        {active?.needsUrl && (
          <Field label="Link to the live post (optional)">
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/…" />
          </Field>
        )}
        <ErrorText>{error}</ErrorText>
      </Modal>

      <Modal
        open={moving}
        onClose={() => setMoving(false)}
        title="Move to another stage"
        description="Use this only to fix mistakes — the normal buttons keep everyone notified."
        footer={
          <Button onClick={move} loading={busy} disabled={moveTo === video.stage}>
            Move
          </Button>
        }
      >
        <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value as Stage)}>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </Select>
      </Modal>
    </>
  );
}
