"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Film, LogOut, Plus, Users, Building2, ChevronRight, Shield, X, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { C, FONT, Card, Button, Avatar, Modal, Field, Toast, inputStyle, ROLE_LABELS } from "@/lib/ui";

const TEAM_ROLES = [
  { value: "editor", label: "Editor" },
  { value: "content_creator", label: "Content Creator" },
  { value: "account_manager", label: "Account Manager" },
];

export default function AgencyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);
  const [access, setAccess] = useState([]); // team_client_access rows
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [toast, setToast] = useState("");

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data: me } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(me);

    const { data: clientRows } = await supabase.from("clients").select("*").order("created_at");
    setClients(clientRows || []);

    if (me?.role === "owner") {
      const { data: teamRows } = await supabase
        .from("profiles")
        .select("*")
        .neq("role", "client")
        .order("created_at");
      setTeam(teamRows || []);

      const { data: accessRows } = await supabase.from("team_client_access").select("*");
      setAccess(accessRows || []);

      const { data: leadRows } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      setLeads(leadRows || []);
    } else {
      const { data: leadRows } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      setLeads(leadRows || []);
    }
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading || !profile) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, color: C.textFaint }}>
        <Loader2 size={20} className="spin" style={{ marginRight: 8 }} /> Loading...
      </div>
    );
  }

  const isOwner = profile.role === "owner";
  const clientsById = Object.fromEntries(clients.map((c) => [c.id, c]));

  return (
    <div style={{ fontFamily: FONT, background: C.bg, minHeight: "100vh" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>

      <div style={{ background: C.navyDark, color: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Film size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Pipelooms</div>
              <div style={{ fontSize: 11, color: "#8E96D9" }}>Agency View</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{profile.full_name}</div>
              <div style={{ fontSize: 11, color: "#8E96D9" }}>{ROLE_LABELS[profile.role]}</div>
            </div>
            <Avatar initials={profile.initials} color={C.gold} size={34} />
            <button onClick={handleLogout} style={{ background: "none", border: "none", cursor: "pointer", color: "#B9C0F0", display: "flex" }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: 0 }}>
              {isOwner ? "Sub-accounts" : "Your Assigned Clients"}
            </h1>
            <p style={{ color: C.textFaint, fontSize: 13, marginTop: 4 }}>
              {isOwner
                ? "Every client workspace lives here. Click into one to manage tasks, calendar, and performance."
                : "You only see the clients assigned to you. Ask your agency owner for access to more."}
            </p>
          </div>
          {isOwner && <Button icon={Plus} onClick={() => setShowNewClient(true)}>New Sub-account</Button>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 36 }}>
          {clients.map((c) => (
            <Card
              key={c.id}
              onClick={() => router.push(`/c/${c.id}`)}
              style={{ padding: 18, cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 8px 28px rgba(26,35,126,0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(26,35,126,0.06)")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <Avatar initials={c.initials} color={c.color} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textFaint }}>{c.contact_name}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                <span style={{ fontSize: 12.5, color: C.teal, fontWeight: 700 }}>Open workspace</span>
                <ChevronRight size={16} color={C.teal} />
              </div>
            </Card>
          ))}
          {clients.length === 0 && (
            <Card style={{ padding: 24, textAlign: "center", color: C.textFaint, fontSize: 14, gridColumn: "1 / -1" }}>
              No sub-accounts yet.
            </Card>
          )}
        </div>

        {isOwner && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <Users size={18} color={C.navy} /> Team
                </h2>
                <p style={{ color: C.textFaint, fontSize: 13, marginTop: 4 }}>
                  Give team members credentials and scope which sub-accounts they can see.
                </p>
              </div>
              <Button icon={Plus} variant="secondary" onClick={() => setShowNewTeam(true)}>Add Team Member</Button>
            </div>

            <Card style={{ padding: 0, marginBottom: 36, overflow: "hidden" }}>
              {team.length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.textFaint, fontSize: 14 }}>No team members yet.</div>}
              {team.map((t, i) => {
                const theirClientIds = access.filter((a) => a.profile_id === t.id).map((a) => a.client_id);
                return (
                  <div
                    key={t.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                      borderTop: i > 0 ? `1px solid ${C.border}` : "none", flexWrap: "wrap",
                    }}
                  >
                    <Avatar initials={t.initials} color={C.navy} size={36} />
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{t.full_name}</div>
                      <div style={{ fontSize: 12, color: C.textFaint }}>{t.email}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 700, background: "rgba(0,151,167,0.1)", color: C.teal,
                        padding: "3px 9px", borderRadius: 999,
                      }}
                    >
                      {ROLE_LABELS[t.role]}
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
                      {theirClientIds.length === 0 && <span style={{ fontSize: 12, color: C.textFaint }}>No sub-accounts assigned</span>}
                      {theirClientIds.map((cid) => (
                        <span
                          key={cid}
                          style={{
                            fontSize: 11.5, background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted,
                            padding: "3px 8px", borderRadius: 4, fontWeight: 600,
                          }}
                        >
                          {clientsById[cid]?.name || "Unknown"}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Card>
          </>
        )}

        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={18} color={C.gold} /> Leads Pipeline
        </h2>
        <p style={{ color: C.textFaint, fontSize: 13, marginBottom: 16 }}>Your agency's own prospective clients — separate from sub-account content work.</p>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {leads.length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.textFaint, fontSize: 14 }}>No leads logged yet.</div>}
          {leads.map((l, i) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: i > 0 ? `1px solid ${C.border}` : "none" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{l.name}</div>
                <div style={{ fontSize: 12, color: C.textFaint }}>{l.company} · {l.source}</div>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: C.teal, background: C.tealLight, padding: "3px 9px", borderRadius: 999 }}>{l.status}</span>
            </div>
          ))}
        </Card>
      </div>

      {showNewClient && (
        <NewClientModal onClose={() => setShowNewClient(false)} onCreated={() => { setShowNewClient(false); notify("Sub-account created"); loadAll(); }} />
      )}
      {showNewTeam && (
        <NewTeamMemberModal clients={clients} onClose={() => setShowNewTeam(false)} onCreated={() => { setShowNewTeam(false); notify("Team member added"); loadAll(); }} />
      )}
      <Toast message={toast} />
    </div>
  );
}

function NewClientModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [color, setColor] = useState("#1A237E");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/create-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactName, email, password, color }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create sub-account");
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New Sub-account" onClose={onClose}>
      <Field label="Business Name">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Realty Group" />
      </Field>
      <Field label="Contact Name">
        <input style={inputStyle} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Sarah Chen" />
      </Field>
      <Field label="Login Email">
        <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sarah@acmerealty.com" />
      </Field>
      <Field label="Temporary Password">
        <input style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set a temp password to share with them" />
      </Field>
      <Field label="Brand Color">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 60, height: 36, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer" }} />
      </Field>
      {error && <p style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={busy || !name || !contactName || !email || !password} onClick={submit}>
          {busy ? "Creating..." : "Create Sub-account"}
        </Button>
      </div>
    </Modal>
  );
}

function NewTeamMemberModal({ clients, onClose, onCreated }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("editor");
  const [clientIds, setClientIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleClient(id) {
    setClientIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/create-team-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, role, clientIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create team member");
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add Team Member" onClose={onClose} wide>
      <Field label="Full Name">
        <input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jordan Lee" />
      </Field>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Field label="Login Email">
            <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@pipelooms.com" />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Temporary Password">
            <input style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set a temp password" />
          </Field>
        </div>
      </div>
      <Field label="Role">
        <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
          {TEAM_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </Field>
      <Field label="Assign Sub-accounts">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, maxHeight: 180, overflowY: "auto" }}>
          {clients.length === 0 && <span style={{ fontSize: 13, color: C.textFaint }}>Create a sub-account first.</span>}
          {clients.map((c) => (
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
              <input type="checkbox" checked={clientIds.includes(c.id)} onChange={() => toggleClient(c.id)} />
              {c.name}
            </label>
          ))}
        </div>
      </Field>
      {error && <p style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={busy || !fullName || !email || !password} onClick={submit}>
          {busy ? "Creating..." : "Add Team Member"}
        </Button>
      </div>
    </Modal>
  );
}
