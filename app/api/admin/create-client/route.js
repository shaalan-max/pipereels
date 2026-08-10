import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "owner") {
    return NextResponse.json({ error: "Only the agency owner can create sub-accounts" }, { status: 403 });
  }

  const { name, contactName, email, password, color } = await request.json();
  if (!name || !contactName || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = createAdminClient();
  const initials = contactName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // 1. Create the client sub-account row
  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({ name, contact_name: contactName, color: color || "#1A237E", initials, created_by: user.id })
    .select()
    .single();
  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });

  // 2. Create the auth user (real Supabase Auth account, confirmed, ready to log in)
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) {
    await admin.from("clients").delete().eq("id", client.id); // roll back
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // 3. Create the profile row linking the auth user to this client, role = 'client'
  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    email,
    full_name: contactName,
    initials,
    role: "client",
    client_id: client.id,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id); // roll back
    await admin.from("clients").delete().eq("id", client.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ client, credentials: { email, password } });
}
