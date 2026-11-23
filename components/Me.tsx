"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { AgencySettings, Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const MeCtx = createContext<{ profile: Profile; settings: AgencySettings } | null>(null);

export function MeProvider({ profile, settings, children }: { profile: Profile; settings: AgencySettings; children: React.ReactNode }) {
  return <MeCtx.Provider value={{ profile, settings }}>{children}</MeCtx.Provider>;
}

export function useMe() {
  const v = useContext(MeCtx);
  if (!v) throw new Error("useMe must be used inside MeProvider");
  return v;
}

export function useSupabase() {
  return createClient();
}

/** Load data on mount (and when deps change); `reload()` refetches without flashing the spinner. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    try {
      const d = await fnRef.current();
      setData(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}

/** Throw Supabase errors so useLoad can show them. */
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
