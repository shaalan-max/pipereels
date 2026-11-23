"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { cx } from "@/components/ui";

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
    setItems((data as Notification[]) || []);
  }, [supabase]);

  useEffect(() => {
    load();
    const t = setInterval(load, 45000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Opening the page a notification points to counts as reading it.
  useEffect(() => {
    const here = items.filter((n) => !n.read_at && n.link === pathname).map((n) => n.id);
    if (!here.length) return;
    supabase.rpc("mark_notifications_read", { p_ids: here }).then(() => load());
  }, [items, pathname, supabase, load]);

  const unread = items.filter((n) => !n.read_at).length;

  async function openItem(n: Notification) {
    setOpen(false);
    if (!n.read_at) {
      await supabase.rpc("mark_notifications_read", { p_ids: [n.id] });
      load();
    }
    if (n.link) router.push(n.link);
  }

  async function markAll() {
    await supabase.rpc("mark_notifications_read", { p_ids: null });
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className={cx(
            "absolute z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-zinc-200",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-zinc-500">You&apos;re all caught up.</p>}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={cx("flex w-full gap-3 border-b border-zinc-50 px-4 py-3 text-left hover:bg-zinc-50", !n.read_at && "bg-brand-soft/40")}
              >
                <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-brand")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-zinc-900">{n.title}</span>
                  {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-500">{n.body}</span>}
                  <span className="mt-1 block text-[11px] text-zinc-400">{timeAgo(n.created_at)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
