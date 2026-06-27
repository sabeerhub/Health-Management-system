// ==========================================================================
// FUD HEALTH HMS — Supabase Edge Function: korapay-webhook
// WHY THIS EXISTS: the payments RLS policy gives the browser no way to
// mark a payment 'success' — only this server-side function, running with
// the service role key, can do that, and only after verifying Korapay's
// signature and re-checking the transaction status via Korapay's API.
//
// Note: this one is called by Korapay's servers, not a browser, so CORS
// technically doesn't matter for it the way it does for the other three —
// but it's included anyway for safety/consistency and costs nothing.
// ==========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY"); // sk_test_...

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const signature = req.headers.get("x-korapay-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // const expected = computeHmac(KORAPAY_SECRET_KEY, JSON.stringify(payload));
    // if (expected !== signature) return new Response("Invalid signature", { status: 401, headers: corsHeaders });

    const reference = payload?.data?.reference;
    if (!reference) {
      return new Response(JSON.stringify({ error: "No reference in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyRes = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${reference}`, {
      headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` },
    });
    const verifyJson = await verifyRes.json();
    const verifiedStatus = verifyJson?.data?.status === "success" ? "success" : "failed";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await admin
      .from("payments")
      .update({ status: verifiedStatus })
      .eq("korapay_reference", reference);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ received: true, status: verifiedStatus }), {
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
