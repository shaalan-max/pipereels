"use client";

import { useState } from "react";
import { KeyRound, Power, UserPlus, Users } from "lucide-react";
import { must, useLoad, useMe, useSupabase } from "@/components/Me";
import type { Profile, Role } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/workflow";
import { Avatar, Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select, Spinner, useToast } from "@/components/ui";
import { CredentialsModal } from "@/components/bits";

const ROLES: { value: Role; label: string; help: string }[] = [
  { value: "account_manager", label: "Account manager", help: "Runs client relationships: plans, footage checks, quality review, posting." },
  { value: "scriptwriter", label: "Scriptwriter", help: "Writes scripts and shooting notes for videos assigned to them." },
  { value: "editor", label: "Video editor", help: "Edits raw footage for videos assigned to them." },
];

export default function TeamPage() {
  const supabase = useSupabase();
  const { profile, settings } = useMe();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string; name?: string } | null>(null);
  const { data, loading, error, reload } = useLoad(async () => must(await supabase.from("profiles").select("*").neq("role", "client").order("created_at")) as Profile[]);

  if (profile.role !== "owner") return <ErrorText>Only the owner can manage the team.</ErrorText>;
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorText>{error || "Could not load"}</ErrorText>;

  async function act(u: Profile, action: "deactivate" | "activate" | "reset_password") {
    if (action === "deactivate" && !confirm(`Disable ${u.full_name}'s login? They will be signed out and can't sign in until you enable them again.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return toast(json.error || "Failed", "error");
    if (action === "reset_password") setCreds({ email: json.email, password: json.password, name: u.full_name });
    else toast(action === "deactivate" ? "Login disabled" : "Login enabled");
    reload();
  }

  return (
    <>
      <PageHeader title="Team" description="Everyone at the agency who uses the portal." actions={<Button icon={UserPlus} onClick={() => setAdding(true)}>Add team member</Button>} />
      <Card>
        {data.length <= 1 ? (
          <EmptyState icon={Users} title="It's just you so far" description="Add your account managers, scriptwriters and editors. Each gets their own login." />
        ) : null}
        <div className="divide-y divide-zinc-100">
          {data.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <Avatar name={u.full_name} size={36} color={u.role === "owner" ? undefined : "#52525b"} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {u.full_name} {u.id === profile.id && <span className="text-xs text-zinc-400">(you)</span>}
                  {!u.active && <Badge tone="red">Disabled</Badge>}
                </div>
                <div className="truncate text-xs text-zinc-500">{u.email}</div>
              </div>
              <Badge tone={u.role === "owner" ? "brand" : "zinc"}>{ROLE_LABEL[u.role]}</Badge>
              {u.role !== "owner" && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => act(u, "reset_password")}>
                    Reset password
                  </Button>
                  <Button size="sm" variant="ghost" icon={Power} onClick={() => act(u, u.active ? "deactivate" : "activate")}>
                    {u.active ? "Disable" : "Enable"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
      {adding && (
        <AddMemberModal
          onClose={() => setAdding(false)}
          onCreated={(c) => {
            setAdding(false);
            setCreds(c);
            reload();
          }}
        />
      )}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} agencyName={settings.name} />
    </>
  );
}

function AddMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: { email: string; password: string; name: string }) => void }) {
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("account_manager");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name, email, role }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error || "Could not create the login");
    onCreated({ email: json.email, password: json.password, name: full_name });
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Add team member"
      description="We'll generate a secure temporary password for you to send them."
      footer={
        <Button onClick={save} loading={busy}>
          Create login
        </Button>
      }
    >
      <Field label="Full name">
        <Input value={full_name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Role" hint={ROLES.find((r) => r.value === role)?.help}>
        <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}
