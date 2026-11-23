"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, KeyRound, Power, Search, Settings, ShieldCheck, SlidersHorizontal, Trash2, UserPlus, Users } from "lucide-react";
import { must, useLoad, useMe, useSupabase } from "@/components/Me";
import type { Client, Profile, Role } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/workflow";
import { fmtDate } from "@/lib/format";
import { Avatar, Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select, Spinner, Tabs, useToast } from "@/components/ui";
import { CredentialsModal } from "@/components/bits";

type Filter = "all" | "team" | "clients" | "disabled";

const CREATE_ROLES: { value: Role; label: string; help: string }[] = [
  { value: "owner", label: "Owner (full admin)", help: "Full access to everything, including this Admin page, all clients, team and billing-level settings." },
  { value: "account_manager", label: "Account manager", help: "Runs clients: plans, footage checks, quality review, posting." },
  { value: "scriptwriter", label: "Scriptwriter", help: "Writes scripts and shooting notes for videos assigned to them." },
  { value: "editor", label: "Video editor", help: "Edits videos assigned to them." },
  { value: "client", label: "Client login", help: "Someone at a client who approves plans, scripts and videos." },
];

export default function AdminPage() {
  const supabase = useSupabase();
  const { profile, settings } = useMe();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string; name?: string } | null>(null);
  const [deleting, setDeleting] = useState<Profile | null>(null);

  const [editing, setEditing] = useState<Profile | null>(null);
  const { data, loading, error, reload } = useLoad(async () => {
    const [people, clients, team] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("clients").select("*").order("name"),
      supabase.from("client_team").select("client_id, profile_id"),
    ]);
    return {
      people: must(people) as Profile[],
      clients: must(clients) as Client[],
      team: must(team) as { client_id: string; profile_id: string }[],
    };
  });

  const clientName = useMemo(() => new Map((data?.clients ?? []).map((c) => [c.id, c.name])), [data]);

  if (profile.role !== "owner") return <ErrorText>Only the owner can open the admin page.</ErrorText>;
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorText>{error || "Could not load"}</ErrorText>;

  const team = data.people.filter((p) => p.role !== "client");
  const clientUsers = data.people.filter((p) => p.role === "client");
  const disabled = data.people.filter((p) => !p.active);
  let rows = filter === "team" ? team : filter === "clients" ? clientUsers : filter === "disabled" ? disabled : data.people;
  const needle = q.trim().toLowerCase();
  if (needle) {
    rows = rows.filter((p) =>
      [p.full_name, p.email, ROLE_LABEL[p.role], p.client_id ? clientName.get(p.client_id) ?? "" : ""].some((s) => s.toLowerCase().includes(needle))
    );
  }

  async function act(u: Profile, action: "deactivate" | "activate" | "reset_password") {
    if (action === "deactivate" && !confirm(`Disable ${u.full_name}'s login? They're signed out and can't sign in until you enable it again.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return toast(json.error || "Failed", "error");
    if (action === "reset_password") setCreds({ email: json.email, password: json.password, name: u.full_name });
    else toast(action === "deactivate" ? "Login disabled" : "Login enabled");
    reload();
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-brand" /> Admin
          </span>
        }
        description="Every login in the system — create, reset, disable or delete accounts."
        actions={
          <>
            <Link href="/settings">
              <Button variant="secondary" icon={Settings}>
                Branding
              </Button>
            </Link>
            <Button icon={UserPlus} onClick={() => setCreating(true)}>
              Create account
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} label="Team accounts" value={team.length} />
        <Stat icon={Users} label="Client logins" value={clientUsers.length} />
        <Stat icon={Building2} label="Clients" value={data.clients.length} />
        <Stat icon={Power} label="Disabled" value={disabled.length} />
      </div>

      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "All", count: data.people.length },
          { value: "team", label: "Team", count: team.length },
          { value: "clients", label: "Client logins", count: clientUsers.length },
          { value: "disabled", label: "Disabled", count: disabled.length },
        ]}
      />

      <Card>
        <div className="border-b border-zinc-100 p-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-zinc-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, role or client…" className="pl-9" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Users} title="No accounts here" description={needle ? "Try a different search." : "Create an account to get started."} />
        ) : (
          <div className="divide-y divide-zinc-100">
            {rows.map((u) => {
              const isMe = u.id === profile.id;
              const protectedRow = isMe;
              const theirClients =
                u.role === "owner" || u.role === "client"
                  ? []
                  : data.clients.filter(
                      (c) => c.account_manager_id === u.id || data.team.some((t) => t.profile_id === u.id && t.client_id === c.id)
                    );
              return (
                <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <Avatar name={u.full_name} size={36} color={u.role === "client" ? "#0f766e" : u.role === "owner" ? undefined : "#52525b"} />
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {u.full_name}
                      {isMe && <span className="text-xs text-zinc-400">(you)</span>}
                      {!u.active && <Badge tone="red">Disabled</Badge>}
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      {u.email} · added {fmtDate(u.created_at)}
                    </div>
                    {u.role === "owner" ? (
                      <div className="mt-1 text-xs text-zinc-500">Access: everything</div>
                    ) : u.role !== "client" ? (
                      <div className="mt-1 text-xs text-zinc-500">
                        Access: {theirClients.length ? theirClients.map((c) => c.name).join(", ") : "no clients yet"}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={u.role === "owner" ? "brand" : u.role === "client" ? "green" : "zinc"}>{ROLE_LABEL[u.role]}</Badge>
                    {u.client_id && (
                      <Link href={`/clients/${u.client_id}`} className="text-xs text-zinc-500 hover:text-brand">
                        {clientName.get(u.client_id) ?? "—"}
                      </Link>
                    )}
                  </div>
                  {!protectedRow && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" icon={SlidersHorizontal} onClick={() => setEditing(u)}>
                        Access
                      </Button>
                      <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => act(u, "reset_password")}>
                        Reset password
                      </Button>
                      <Button size="sm" variant="ghost" icon={Power} onClick={() => act(u, u.active ? "deactivate" : "activate")}>
                        {u.active ? "Disable" : "Enable"}
                      </Button>
                      <Button size="sm" variant="ghost" icon={Trash2} className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeleting(u)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {creating && (
        <CreateAccountModal
          clients={data.clients.filter((c) => c.status !== "archived")}
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setCreating(false);
            setCreds(c);
            reload();
          }}
        />
      )}
      {editing && (
        <AccessModal
          user={editing}
          clients={data.clients}
          currentClientIds={data.team.filter((t) => t.profile_id === editing.id).map((t) => t.client_id)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast("Access updated");
            reload();
          }}
        />
      )}
      {deleting && (
        <DeleteModal
          user={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            toast("Account deleted");
            reload();
          }}
        />
      )}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} agencyName={settings.name} />
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-zinc-500">{label}</span>
        <Icon className="size-4 text-zinc-400" />
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </Card>
  );
}

function CreateAccountModal({ clients, onClose, onCreated }: { clients: Client[]; onClose: () => void; onCreated: (c: { email: string; password: string; name: string }) => void }) {
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("account_manager");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (role === "client" && !clientId) return setError("Choose which client this login belongs to.");
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name, email, role, client_id: role === "client" ? clientId : undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error || "Could not create the account");
    onCreated({ email: json.email, password: json.password, name: full_name });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Create account"
      description="A secure temporary password is generated for you to send them. They can change it after signing in."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Create account
          </Button>
        </>
      }
    >
      <Field label="Account type" hint={CREATE_ROLES.find((r) => r.value === role)?.help}>
        <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {CREATE_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      {role === "client" &&
        (clients.length ? (
          <Field label="Client">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            Create the client first on the <Link href="/clients" className="font-medium underline">Clients</Link> page, then add their login here.
          </p>
        ))}
      <Field label="Full name">
        <Input value={full_name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}

function DeleteModal({ user, onClose, onDeleted }: { user: Profile; onClose: () => void; onDeleted: () => void }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error || "Could not delete the account");
    onDeleted();
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={`Delete ${user.full_name}'s account?`}
      description="They can no longer sign in and the login is removed for good. Their past comments and history stay (shown as “Former member”). If you might need them again, use Disable instead."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={remove} loading={busy} disabled={typed.trim().toLowerCase() !== user.email.toLowerCase()}>
            Delete forever
          </Button>
        </>
      }
    >
      <Field label={`Type their email (${user.email}) to confirm`}>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
      </Field>
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}

function AccessModal({ user, clients, currentClientIds, onClose, onSaved }: {
  user: Profile;
  clients: Client[];
  currentClientIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isClient = user.role === "client";
  const [role, setRole] = useState<Role>(user.role);
  const [clientIds, setClientIds] = useState<string[]>(currentClientIds);
  const [clientId, setClientId] = useState(user.client_id ?? clients[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const teamRoles = CREATE_ROLES.filter((r) => r.value !== "client");

  async function save() {
    if (role === "owner" && user.role !== "owner" && !confirm(`Make ${user.full_name} an owner? They will have full admin access to everything, including this page.`)) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isClient ? { action: "set_access", client_id: clientId } : { action: "set_access", role, client_ids: clientIds }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error || "Could not update access");
    onSaved();
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={`Access for ${user.full_name}`}
      description={user.email}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save access
          </Button>
        </>
      }
    >
      {isClient ? (
        <Field label="Client this login belongs to" hint="They only ever see this client's plans and videos.">
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <>
          <Field label="Role" hint={teamRoles.find((r) => r.value === role)?.help}>
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {teamRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          {role === "owner" ? (
            <p className="rounded-lg bg-brand-soft px-3 py-2 text-[13px] text-zinc-700">Owners can see and do everything, so there's no client list to choose.</p>
          ) : (
            <Field
              label="Clients they can see and work on"
              hint="Scriptwriters and editors are also added automatically when you assign them a video. To make someone the main account manager of a client, set it on that client's Details tab."
            >
              {clients.length === 0 ? (
                <p className="text-[13px] text-zinc-500">No clients yet.</p>
              ) : (
                <div className="grid max-h-64 gap-1 overflow-y-auto rounded-lg p-1 ring-1 ring-zinc-200 sm:grid-cols-2">
                  {clients.map((c) => {
                    const on = clientIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50">
                        <input
                          type="checkbox"
                          className="accent-brand"
                          checked={on}
                          onChange={() => setClientIds(on ? clientIds.filter((x) => x !== c.id) : [...clientIds, c.id])}
                        />
                        <span className="size-2 rounded-full" style={{ background: c.brand_color }} />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </Field>
          )}
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}
