// ==========================================================================
// FUD HEALTH HMS — Supabase Edge Function: admin-create-staff
// Deploy with: supabase functions deploy admin-create-staff
// Runs with the SERVICE ROLE key (set as a Supabase secret, never shipped
// to the browser). Only an authenticated 'admin' may call this.
// ==========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    // 1. Identify the caller from their JWT and confirm they're an admin.
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerUser, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !callerUser?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", callerUser.user.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can create staff accounts" }), { status: 403 });
    }

    // 2. Validate input.
    const body = await req.json();
    const { email, password, fullName, role, specialty, licenseNumber } = body;
    if (!email || !password || !fullName || !["doctor", "pharmacist"].includes(role)) {
      return new Response(JSON.stringify({ error: "Missing or invalid fields" }), { status: 400 });
    }

    // 3. Create the auth user (the handle_new_user trigger will insert a
    //    default 'patient' profile row — we immediately overwrite it below).
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 400 });
    }

    const newId = created.user.id;

    // 4. Overwrite role explicitly (server-trusted, never from client metadata).
    await admin.from("profiles").update({ role, full_name: fullName }).eq("id", newId);

    if (role === "doctor") {
      await admin.from("doctors").upsert({ id: newId, specialty, license_number: licenseNumber });
    } else {
      await admin.from("pharmacists").upsert({ id: newId, license_number: licenseNumber });
    }

    return new Response(JSON.stringify({ success: true, userId: newId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
