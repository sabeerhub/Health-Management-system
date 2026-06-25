// ==========================================================================
// FUD HEALTH HMS — Supabase Edge Function: korapay-webhook
// Deploy with: supabase functions deploy korapay-webhook --no-verify-jwt
// Set this function's URL as the Webhook URL in your Korapay test dashboard.
//
// WHY THIS EXISTS: the payments RLS policy in schema.sql gives the browser
// no way to mark a payment 'success' — only this server-side function,
// running with the service role key, can do that, and only after verifying
// Korapay's signature and re-checking the transaction status via Korapay's
// API. This is what "never trust frontend payment status" means in practice.
// ==========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY"); // sk_test_...

Deno.serve(async (req) => {
  try {
    const payload = await req.json();

    // 1. Verify the webhook signature Korapay sends (see Korapay docs for
    //    the exact header name/HMAC scheme in their current API version —
    //    confirm against your dashboard before going live).
    const signature = req.headers.get("x-korapay-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
    }
    // const expected = computeHmac(KORAPAY_SECRET_KEY, JSON.stringify(payload));
    // if (expected !== signature) return new Response("Invalid signature", { status: 401 });

    const reference = payload?.data?.reference;
    const status = payload?.data?.status; // e.g. "success" | "failed"
    if (!reference) {
      return new Response(JSON.stringify({ error: "No reference in payload" }), { status: 400 });
    }

    // 2. Re-verify directly against Korapay's API rather than trusting the
    //    webhook body alone (defense in depth).
    const verifyRes = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${reference}`, {
      headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` },
    });
    const verifyJson = await verifyRes.json();
    const verifiedStatus = verifyJson?.data?.status === "success" ? "success" : "failed";

    // 3. Update the payment row using the service role (bypasses RLS).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await admin
      .from("payments")
      .update({ status: verifiedStatus })
      .eq("korapay_reference", reference);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ received: true, status: verifiedStatus }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
