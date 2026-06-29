// ==========================================================================
// FUD HEALTH HMS — PAYMENTS API
// Payments can only be inserted as 'pending' by the patient (enforced by
// RLS in schema.sql). Flipping to 'success'/'failed' happens server-side:
// automatically via the korapay-webhook Edge Function when Korapay calls
// it, or on-demand via verifyPaymentStatus() below for an admin who wants
// to double-check a transaction immediately.
// ==========================================================================

import { supabase } from "../supabaseClient.js?v2";

export async function listPaymentsForPatient(patientId) {
  const { data, error } = await supabase
    .from("payments").select("*").eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listAllPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select("*, patients(reg_number, profiles(full_name, email))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPendingPayment({ patientId, appointmentId, amount, reference }) {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      patient_id: patientId, appointment_id: appointmentId || null,
      amount, currency: "NGN", korapay_reference: reference, status: "pending",
    })
    .select().single();
  if (error) throw error;
  return data;
}

/** Admin clicks "Verify Payment" — calls the server, which re-checks with Korapay directly. */
export async function verifyPaymentStatus(reference) {
  const { data, error } = await supabase.functions.invoke("verify-payment", { body: { reference } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Admin clicks "Mark as Paid" or "Cancel Transaction" after checking the
 * real Korapay merchant dashboard themselves. Still goes through the same
 * admin-role-checked Edge Function as the automatic verify above — the
 * browser never writes payment status directly, this just tells the
 * server which outcome to record instead of asking Korapay's API for it.
 */
export async function markPaymentManually(reference, status) {
  if (status !== "success" && status !== "failed") {
    throw new Error('status must be "success" or "failed"');
  }
  const { data, error } = await supabase.functions.invoke("verify-payment", {
    body: { reference, manualStatus: status },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Lightweight client-side refresh — re-reads the row in case the webhook already updated it. */
export async function refreshPayment(reference) {
  const { data, error } = await supabase.from("payments").select("*").eq("korapay_reference", reference).single();
  if (error) throw error;
  return data;
}
