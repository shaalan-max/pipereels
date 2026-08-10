import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_ROLES = ["editor", "content_creator", "account_manager"];

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "owner") {
    return NextResponse.json({ error: "Only the agency owner can add team members" }, { status: 403 });
  }

  const { fullName, email, password, role, clientIds } = await request.json();
  if (!fullName || !email || !password || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = createAdminClient();
  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // 1. Create the auth user
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // 2. Create the profile row
  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    email,
    full_name: fullName,
    initials,
    role,
    client_id: null,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id); // roll back
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // 3. Grant access to the selected sub-accounts
  if (Array.isArray(clientIds) && clientIds.length > 0) {
    const rows = clientIds.map((clientId) => ({ profile_id: authUser.user.id, client_id: clientId }));
    const { error: accessError } = await admin.from("team_client_access").insert(rows);
    if (accessError) return NextResponse.json({ error: accessError.message }, { status: 500 });
  }

  return NextResponse.json({ profileId: authUser.user.id, credentials: { email, password } });
}
