// ==========================================================================
// FUD HEALTH HMS — Supabase Edge Function: admin-delete-staff
// Deploy with: supabase functions deploy admin-delete-staff
// Deleting an auth user requires the service-role key — only this function
// can do it, and only after confirming the caller is an admin.
// ==========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

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
      .from("profiles").select("role").eq("id", callerUser.user.id).single();

    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can delete staff accounts" }), { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), { status: 400 });
    }

    // Prevent an admin from deleting themselves by accident via this endpoint.
    if (userId === callerUser.user.id) {
      return new Response(JSON.stringify({ error: "You cannot delete your own account here" }), { status: 400 });
    }

    // Deleting the auth user cascades to profiles/doctors/pharmacists via
    // `on delete cascade` foreign keys defined in schema.sql.
    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
