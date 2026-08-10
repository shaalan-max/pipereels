"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home, ClipboardList, Calendar as CalendarIcon, TrendingUp, LogOut, ArrowLeftRight, Loader2, Bell,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { C, FONT, Avatar, PageShellStyles, ROLE_LABELS } from "@/lib/ui";
import { WorkspaceContext } from "@/lib/workspace-context";

const NAV_ITEMS = [
  { id: "", label: "Home", icon: Home },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "calendar", label: "Calendar", icon: CalendarIcon },
  { id: "performance", label: "Performance", icon: TrendingUp },
];

export default function ClientWorkspaceLayout({ children, params }) {
  const clientId = params.clientId;
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [state, setState] = useState({ loading: true, profile: null, client: null, notFound: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      // RLS on `clients` already scopes this to rows the user has access to.
      const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();

      if (cancelled) return;
      if (!client) {
        setState({ loading: false, profile, client: null, notFound: true });
        return;
      }
      setState({ loading: false, profile, client, notFound: false });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (state.loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, color: C.textFaint }}>
        <Loader2 size={20} style={{ marginRight: 8 }} /> Loading workspace...
      </div>
    );
  }

  if (state.notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONT, gap: 12 }}>
        <p style={{ color: C.textMuted, fontSize: 15 }}>You don't have access to this workspace, or it doesn't exist.</p>
        <button onClick={() => router.push("/")} style={{ color: C.teal, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}>
          Go back
        </button>
      </div>
    );
  }

  const { profile, client } = state;
  const isAgency = profile.role !== "client";
  const activeSegment = pathname.split(`/c/${clientId}`)[1]?.replace(/^\//, "") || "";

  return (
    <WorkspaceContext.Provider value={{ profile, client, clientId, supabase }}>
      <div style={{ fontFamily: FONT, background: C.bg, minHeight: "100vh" }}>
        <PageShellStyles />
        <div className="pl-shell">
          <div className="pl-sidebar" style={{ background: C.navyDark, color: "#fff", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 18px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Avatar initials={client.initials} color={client.color} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.name}</div>
                  <div style={{ fontSize: 11, color: "#8E96D9" }}>Client Workspace</div>
                </div>
              </div>
              {isAgency && (
                <button
                  onClick={() => router.push("/agency")}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                    borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)",
                    color: "#B9C0F0", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                  }}
                >
                  <ArrowLeftRight size={14} /> Switch account
                </button>
              )}
            </div>
            <nav style={{ flex: 1, padding: "4px 12px" }}>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSegment === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(`/c/${clientId}${item.id ? "/" + item.id : ""}`)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                      marginBottom: 4, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: FONT,
                      background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                      borderLeft: isActive ? `3px solid ${C.teal}` : "3px solid transparent",
                      color: isActive ? "#fff" : "#B9C0F0", fontWeight: isActive ? 700 : 500, fontSize: 14, textAlign: "left",
                    }}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 4 }}>
                <Avatar initials={profile.initials} color={C.gold} size={28} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.full_name}</div>
                  <div style={{ fontSize: 10.5, color: "#8E96D9" }}>{ROLE_LABELS[profile.role]}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 6,
                  border: "none", background: "transparent", cursor: "pointer", color: "#B9C0F0", fontFamily: FONT,
                  fontSize: 14, textAlign: "left",
                }}
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>

          <div className="pl-main">
            <div className="pl-topbar" style={{ alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#fff", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: 15 }}>{client.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {isAgency && (
                  <button onClick={() => router.push("/agency")} style={{ background: "none", border: "none", color: C.teal, display: "flex" }}>
                    <ArrowLeftRight size={18} />
                  </button>
                )}
                <Bell size={18} color={C.textFaint} />
                <Avatar initials={profile.initials} color={C.gold} size={30} />
              </div>
            </div>
            {children}
          </div>
        </div>

        <div className="pl-bottomnav" style={{ background: "#fff", borderTop: `1px solid ${C.border}`, alignItems: "center", justifyContent: "space-around", padding: "8px 4px" }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSegment === item.id;
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/c/${clientId}${item.id ? "/" + item.id : ""}`)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none",
                  border: "none", cursor: "pointer", color: isActive ? C.teal : C.textFaint, fontFamily: FONT, padding: "4px 10px",
                }}
              >
                <Icon size={20} />
                <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
