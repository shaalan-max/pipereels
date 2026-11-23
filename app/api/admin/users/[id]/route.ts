import { NextResponse } from "next/server";
import { createAdminClient, hasServiceKey } from "@/lib/supabase/admin";
import { tempPassword } from "@/lib/admin-users";
import { callerCanManageClient, getCaller } from "@/lib/api-auth";
import { errorMessage } from "@/lib/format";
import type { Profile, Role } from "@/lib/types";

const TEAM_ROLES: Role[] = ["owner", "account_manager", "scriptwriter", "editor"];

async function ownerCount(admin: ReturnType<typeof createAdminClient>) {
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner").eq("active", true);
  return count ?? 0;
}

// actions: deactivate | activate | reset_password | set_access
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const caller = await getCaller();
  if (!caller) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  if (!hasServiceKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." }, { status: 500 });
  if (id === caller.profile.id) return NextResponse.json({ error: "You can't change your own access — ask another owner, or use the account menu for your password" }, { status: 400 });

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const t = target as Profile;
  const isOwnerCaller = caller.profile.role === "owner";

  // Owners can manage everyone (other owners included); account managers only their clients' logins.
  const allowed = isOwnerCaller
    ? true
    : t.role === "client" && t.client_id !== null && (await callerCanManageClient(caller.supabase, caller.profile, t.client_id));
  if (!allowed) return NextResponse.json({ error: "You can't manage this login" }, { status: 403 });

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "set_access") {
      if (!isOwnerCaller) return NextResponse.json({ error: "Only an owner can change access" }, { status: 403 });
      const clientIds: string[] = Array.isArray(body.client_ids) ? body.client_ids.map(String) : [];

      if (t.role === "client") {
        // A client login belongs to exactly one client.
        const clientId = String(body.client_id ?? "");
        if (!clientId) throw new Error("Choose a client");
        const { error } = await admin.from("profiles").update({ client_id: clientId }).eq("id", id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      const role = String(body.role) as Role;
      if (!TEAM_ROLES.includes(role)) throw new Error("Choose a valid role");
      if (t.role === "owner" && role !== "owner" && (await ownerCount(admin)) <= 1) {
        throw new Error("At least one owner must remain");
      }
      const { error } = await admin.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
      // Which clients this team member works on (owners see everything, so the list is cleared).
      await admin.from("client_team").delete().eq("profile_id", id);
      if (role !== "owner" && clientIds.length) {
        const { error: teamError } = await admin.from("client_team").insert(clientIds.map((client_id) => ({ client_id, profile_id: id })));
        if (teamError) throw teamError;
      }
      return NextResponse.json({ ok: true });
    }

    if (t.role === "owner" && action === "deactivate" && (await ownerCount(admin)) <= 1) {
      throw new Error("At least one owner must remain");
    }
    if (action === "deactivate" || action === "activate") {
      const active = action === "activate";
      const { error: banError } = await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
      if (banError) throw banError;
      const { error } = await admin.from("profiles").update({ active }).eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    if (action === "reset_password") {
      const password = tempPassword();
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) throw error;
      return NextResponse.json({ email: t.email, password });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}

// Permanently deletes a login (owner only; never an owner account).
// Their past comments/history stay and show as "Former member"; assignments are cleared.
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const caller = await getCaller();
  if (!caller) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  if (caller.profile.role !== "owner") return NextResponse.json({ error: "Only the owner can delete accounts" }, { status: 403 });
  if (!hasServiceKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." }, { status: 500 });
  if (id === caller.profile.id) return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", id).maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if ((target as Pick<Profile, "role">).role === "owner" && (await ownerCount(admin)) <= 1) {
    return NextResponse.json({ error: "At least one owner must remain" }, { status: 403 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  return NextResponse.json({ ok: true });
}
