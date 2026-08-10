"use client";
import { X } from "lucide-react";

/* ---------------------------------------------------------------
   DESIGN TOKENS — Pipelooms "Executive Pipeline" design system
--------------------------------------------------------------- */
export const C = {
  navy: "#1A237E",
  navyDark: "#000666",
  navyDeep: "#0A0C3D",
  teal: "#0097A7",
  tealLight: "#E0F5F7",
  gold: "#FFA000",
  goldDark: "#E08E00",
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  border: "#E1E3E4",
  borderStrong: "#CFD8DC",
  text: "#191C1D",
  textMuted: "#454652",
  textFaint: "#767683",
  danger: "#BA1A1A",
  dangerBg: "#FFDAD6",
};

export const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const STATUS_META = {
  "To Shoot": { bg: "rgba(26,35,126,0.09)", fg: C.navy },
  "In Review": { bg: "rgba(255,160,0,0.14)", fg: C.goldDark },
  "Needs Revision": { bg: "rgba(186,26,26,0.10)", fg: C.danger },
  Submitted: { bg: "#E7E8E9", fg: C.textMuted },
  Approved: { bg: "rgba(0,151,167,0.12)", fg: C.teal },
  Live: { bg: "rgba(0,151,167,0.12)", fg: C.teal },
};

export const ROLE_LABELS = {
  owner: "Agency Owner",
  editor: "Editor",
  content_creator: "Content Creator",
  account_manager: "Account Manager",
  client: "Client",
};

export const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 6,
  border: `1px solid ${C.borderStrong}`,
  fontSize: 14,
  fontFamily: FONT,
  color: C.text,
  outline: "none",
};

export function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
export function fmtDateFull(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
export function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

/* ---------------------------------------------------------------
   PRIMITIVES
--------------------------------------------------------------- */
export function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Submitted;
  return (
    <span
      style={{
        background: meta.bg, color: meta.fg, fontSize: 12, fontWeight: 600,
        padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap", letterSpacing: 0.2,
      }}
    >
      {status}
    </span>
  );
}

export function Avatar({ initials, color = C.navy, size = 32 }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", background: color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export function Button({ children, variant = "primary", onClick, style, type = "button", disabled, icon: Icon }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontWeight: 700, fontSize: 14, borderRadius: 6, padding: "10px 18px", cursor: disabled ? "default" : "pointer",
    border: "none", transition: "opacity 0.15s", opacity: disabled ? 0.5 : 1, fontFamily: FONT,
  };
  const variants = {
    primary: { background: C.gold, color: "#fff" },
    secondary: { background: "transparent", color: C.navy, border: `1.5px solid ${C.navy}` },
    tertiary: { background: "transparent", color: C.teal, border: "none", padding: "10px 8px" },
    ghost: { background: C.bg, color: C.textMuted, border: `1px solid ${C.border}` },
    danger: { background: "transparent", color: C.danger, border: `1.5px solid ${C.dangerBg}` },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function Card({ children, style, ...rest }) {
  return (
    <div
      style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
        boxShadow: "0 4px 20px rgba(26,35,126,0.06)", ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6, letterSpacing: 0.3 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(10,12,61,0.55)", zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 12, width: "100%", maxWidth: wide ? 640 : 460,
          maxHeight: "88vh", overflowY: "auto", padding: 24, fontFamily: FONT,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: C.navy, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textFaint }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 200,
        background: C.navyDark, color: "#fff", padding: "12px 20px", borderRadius: 8, fontSize: 14,
        fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      }}
    >
      {message}
    </div>
  );
}

export function PageShellStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      .pl-shell { display: flex; min-height: 100vh; }
      .pl-sidebar { width: 240px; flex-shrink: 0; display: none; }
      .pl-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .pl-topbar { display: flex; }
      .pl-bottomnav { display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; }
      @media (min-width: 860px) {
        .pl-sidebar { display: flex; }
        .pl-bottomnav { display: none; }
        .pl-topbar { display: none; }
      }
      input:focus, textarea:focus, select:focus { border-color: ${C.teal} !important; border-width: 2px; }
      table tr:hover { background: ${C.bg}; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-thumb { background: #D0D3E0; border-radius: 8px; }
    `}</style>
  );
}
