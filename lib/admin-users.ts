import "server-only";
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/types";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Readable, strong temporary password, e.g. "Hk7m-Qp4t-Zr9w-Bn3x". */
export function tempPassword() {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return [group(), group(), group(), group()].join("-");
}

export function cleanEmail(email: unknown) {
  const e = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error("Enter a valid email address");
  return e;
}

export function cleanName(name: unknown) {
  const n = String(name ?? "").trim();
  if (n.length < 2 || n.length > 80) throw new Error("Enter the person's full name");
  return n;
}

/** Creates the Supabase Auth login + profile row; rolls back the login if the profile fails. */
export async function createLogin(
  admin: SupabaseClient,
  input: { email: string; full_name: string; role: Role; client_id: string | null; password?: string }
) {
  const password = input.password || tempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  });
  if (error || !data.user) {
    const msg = error?.message || "Could not create the login";
    throw new Error(/already/i.test(msg) ? "Someone with this email already has a login" : msg);
  }
  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    email: input.email,
    full_name: input.full_name,
    role: input.role,
    client_id: input.client_id,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(profileError.message);
  }
  return { id: data.user.id, password };
}
