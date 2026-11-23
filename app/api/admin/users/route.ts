import { NextResponse } from "next/server";
import { createAdminClient, hasServiceKey } from "@/lib/supabase/admin";
import { cleanEmail, cleanName, createLogin } from "@/lib/admin-users";
import { callerCanManageClient, getCaller } from "@/lib/api-auth";
import { errorMessage } from "@/lib/format";
import type { Role } from "@/lib/types";

// "owner" = full admin access. Only an existing owner can create one.
const TEAM_ROLES: Role[] = ["owner", "account_manager", "scriptwriter", "editor"];

// Create a login. Owner: team members + client users. Account manager: client users for their clients.
export async function POST(request: Request) {
  const caller = await getCaller();
  if (!caller) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  if (!hasServiceKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." }, { status: 500 });

  try {
    const body = await request.json();
    const role = String(body.role) as Role;
    const email = cleanEmail(body.email);
    const full_name = cleanName(body.full_name);

    if (role === "client") {
      const clientId = String(body.client_id ?? "");
      if (!clientId || !(await callerCanManageClient(caller.supabase, caller.profile, clientId))) {
        return NextResponse.json({ error: "You can't add logins to this client" }, { status: 403 });
      }
      const created = await createLogin(createAdminClient(), { email, full_name, role, client_id: clientId });
      return NextResponse.json({ id: created.id, email, password: created.password });
    }

    if (!TEAM_ROLES.includes(role)) return NextResponse.json({ error: "Choose a valid role" }, { status: 400 });
    if (caller.profile.role !== "owner") return NextResponse.json({ error: "Only the owner can add team members" }, { status: 403 });
    const created = await createLogin(createAdminClient(), { email, full_name, role, client_id: null });
    return NextResponse.json({ id: created.id, email, password: created.password });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
