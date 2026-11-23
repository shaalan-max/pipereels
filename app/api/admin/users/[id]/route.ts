import { NextResponse } from "next/server";
import { createAdminClient, hasServiceKey } from "@/lib/supabase/admin";
import { tempPassword } from "@/lib/admin-users";
import { callerCanManageClient, getCaller } from "@/lib/api-auth";
import { errorMessage } from "@/lib/format";
import type { Profile } from "@/lib/types";

// actions: deactivate | activate | reset_password
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const caller = await getCaller();
  if (!caller) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  if (!hasServiceKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." }, { status: 500 });
  if (id === caller.profile.id) return NextResponse.json({ error: "Use the account menu to manage your own login" }, { status: 400 });

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const t = target as Profile;

  const allowed =
    caller.profile.role === "owner"
      ? t.role !== "owner"
      : t.role === "client" && t.client_id !== null && (await callerCanManageClient(caller.supabase, caller.profile, t.client_id));
  if (!allowed) return NextResponse.json({ error: "You can't manage this login" }, { status: 403 });

  try {
    const { action } = await request.json();
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
