"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/workflow";
import { Avatar, Button, ErrorText, Field, Input, Modal, cx, useToast } from "@/components/ui";
import { errorMessage } from "@/lib/format";

export function UserMenu({ profile, compact, up }: { profile: Profile; compact?: boolean; up?: boolean }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-zinc-100" aria-label="Account menu">
        <Avatar name={profile.full_name} size={32} />
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-zinc-900">{profile.full_name}</span>
            <span className="block truncate text-xs text-zinc-500">{ROLE_LABEL[profile.role]}</span>
          </span>
        )}
      </button>
      {open && (
        <div className={cx("absolute right-0 z-40 w-56 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-zinc-200", up ? "bottom-full mb-2" : "mt-2")}>
          <div className="border-b border-zinc-100 px-3 py-2">
            <div className="truncate text-[13px] font-medium">{profile.full_name}</div>
            <div className="truncate text-xs text-zinc-500">{profile.email}</div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              setPwOpen(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <KeyRound className="size-4" /> Change password
          </button>
          <button onClick={signOut} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const supabase = createClient();
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    if (pw.length < 10) return setError("Use at least 10 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    toast("Password updated");
    setPw("");
    setPw2("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change password"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save password
          </Button>
        </>
      }
    >
      <Field label="New password" hint="At least 10 characters.">
        <Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </Field>
      <Field label="Repeat new password">
        <Input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}
