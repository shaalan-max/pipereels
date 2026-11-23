import { NextResponse } from "next/server";
import { createAdminClient, hasServiceKey } from "@/lib/supabase/admin";
import { cleanEmail, cleanName, createLogin } from "@/lib/admin-users";
import { errorMessage } from "@/lib/format";

// One-time: creates the first owner account. Closes itself as soon as an owner exists.
export async function POST(request: Request) {
  if (!hasServiceKey()) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." }, { status: 500 });
  }
  const admin = createAdminClient();
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner");
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Setup is already complete. Sign in instead." }, { status: 403 });
  }
  try {
    const body = await request.json();
    const email = cleanEmail(body.email);
    const full_name = cleanName(body.full_name);
    const password = String(body.password ?? "");
    if (password.length < 10) throw new Error("Use a password of at least 10 characters");
    const agencyName = String(body.agency_name ?? "").trim();

    await createLogin(admin, { email, full_name, role: "owner", client_id: null, password });
    if (agencyName) {
      await admin.from("agency_settings").update({ name: agencyName.slice(0, 60), updated_at: new Date().toISOString() }).eq("id", 1);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
