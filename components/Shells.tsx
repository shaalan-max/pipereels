"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, KanbanSquare, Building2, ShieldCheck, Settings, Menu, X, Home } from "lucide-react";
import type { AgencySettings, Profile } from "@/lib/types";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { cx } from "@/components/ui";
import { MeProvider } from "@/components/Me";

export function BrandMark({ settings, size = "md" }: { settings: AgencySettings; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-11 text-lg rounded-xl" : "size-8 text-sm rounded-lg";
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className={cx("flex shrink-0 items-center justify-center bg-brand font-bold text-white", box)}>
        {settings.name.trim().charAt(0).toUpperCase() || "P"}
      </span>
      <span className={cx("truncate font-semibold tracking-tight text-zinc-900", size === "lg" ? "text-xl" : "text-[15px]")}>{settings.name}</span>
    </span>
  );
}

export function BrandStyle({ color, children }: { color: string; children: React.ReactNode }) {
  return <div style={{ ["--brand" as string]: color || "#4F46E5" }}>{children}</div>;
}

const TEAM_NAV = [
  { href: "/dashboard", label: "My work", icon: LayoutDashboard },
  { href: "/board", label: "Production board", icon: KanbanSquare },
  { href: "/clients", label: "Clients", icon: Building2 },
];
const OWNER_NAV = [
  { href: "/admin", label: "Admin", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TeamShell({ profile, settings, children }: { profile: Profile; settings: AgencySettings; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = profile.role === "owner" ? [...TEAM_NAV, ...OWNER_NAV] : TEAM_NAV;

  const links = (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-soft text-brand" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            <Icon className="size-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <BrandStyle color={settings.brand_color}>
      <div className="min-h-screen lg:pl-64">
        {/* desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-zinc-200 bg-white lg:flex">
          <div className="flex h-16 items-center justify-between px-5">
            <Link href="/dashboard">
              <BrandMark settings={settings} />
            </Link>
            <NotificationBell align="left" />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2">{links}</div>
          <div className="border-t border-zinc-100 p-3">
            <UserMenu profile={profile} up />
          </div>
        </aside>

        {/* mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="-ml-2 rounded-lg p-2 text-zinc-600 hover:bg-zinc-100" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <Link href="/dashboard">
            <BrandMark settings={settings} />
          </Link>
          <div className="flex items-center">
            <NotificationBell />
            <UserMenu profile={profile} compact />
          </div>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-zinc-950/40" onClick={() => setMobileOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 bg-white p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <BrandMark settings={settings} />
                <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Close menu">
                  <X className="size-5" />
                </button>
              </div>
              {links}
            </div>
          </div>
        )}

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <MeProvider profile={profile} settings={settings}>{children}</MeProvider>
        </main>
      </div>
    </BrandStyle>
  );
}

export function PortalShell({ profile, settings, clientName, children }: { profile: Profile; settings: AgencySettings; clientName: string; children: React.ReactNode }) {
  return (
    <BrandStyle color={settings.brand_color}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/portal" className="min-w-0">
              <BrandMark settings={settings} />
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/portal" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 sm:flex">
                <Home className="size-4" /> {clientName}
              </Link>
              <NotificationBell />
              <UserMenu profile={profile} compact />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          <MeProvider profile={profile} settings={settings}>{children}</MeProvider>
        </main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-center text-xs text-zinc-400 sm:px-6">
          {settings.name} · {settings.tagline}
        </footer>
      </div>
    </BrandStyle>
  );
}
