// ==========================================================================
// FUD HEALTH HMS — Supabase Edge Function: verify-payment
// Admin-triggered re-check (the webhook handles automatic updates; this is
// the manual "Verify Payment" button for cases where a webhook was missed).
// ==========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerUser, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !callerUser?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: callerProfile } = await admin
      .from("profiles").select("role").eq("id", callerUser.user.id).single();
    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can verify payments" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reference, manualStatus } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "reference is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let verifiedStatus;

    if (manualStatus === "success" || manualStatus === "failed") {
      // Manual admin override — used when the admin has checked the real
      // Korapay merchant dashboard themselves and wants to record that
      // outcome directly, without depending on the automatic API check.
      // Still fully gated by the admin-role check above; the browser can
      // never set this on its own without going through this function.
      verifiedStatus = manualStatus;
      console.log("Manual admin override for", reference, "-> set to:", verifiedStatus);
    } else {
      const verifyRes = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${reference}`, {
        headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` },
      });
      const verifyJson = await verifyRes.json();
      const rawStatus = verifyJson?.data?.status;
      console.log("Korapay verify response for", reference, "-> raw status:", rawStatus, "full body:", JSON.stringify(verifyJson));

      if (rawStatus === "success") {
        verifiedStatus = "success";
      } else if (rawStatus === "failed") {
        verifiedStatus = "failed";
      } else {
        verifiedStatus = "pending";
      }
    }

    const { error } = await admin.from("payments").update({ status: verifiedStatus }).eq("korapay_reference", reference);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, status: verifiedStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
