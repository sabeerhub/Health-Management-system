// ==========================================================================
// FUD HEALTH HMS — PRESCRIPTIONS API
// "Send Prescription to Pharmacy" = creating the row, since RLS already
// makes every 'pending' prescription visible to all pharmacists immediately
// — there's no separate inbox to push to, the query *is* the inbox.
// ==========================================================================

import { supabase } from "../supabaseClient.js";

const SELECT_FULL = `
  id, medication, dosage, duration, notes, status, created_at,
  patients ( id, reg_number, profiles ( full_name, email, phone ) ),
  doctors ( id, specialty, profiles ( full_name ) )
`;

export async function createPrescription({ patientId, doctorId, appointmentId, medication, dosage, duration, notes }) {
  const { data, error } = await supabase
    .from("prescriptions")
    .insert({
      patient_id: patientId, doctor_id: doctorId, appointment_id: appointmentId || null,
      medication, dosage, duration, notes, status: "pending",
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function listPrescriptionsForDoctor(doctorId) {
  const { data, error } = await supabase
    .from("prescriptions").select(SELECT_FULL).eq("doctor_id", doctorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listPrescriptionsForPatient(patientId) {
  const { data, error } = await supabase
    .from("prescriptions").select(SELECT_FULL).eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listIncomingPrescriptions() {
  const { data, error } = await supabase
    .from("prescriptions").select(SELECT_FULL).eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listDispensingHistory() {
  const { data, error } = await supabase
    .from("dispensing_records")
    .select(`
      id, quantity_dispensed, dispensed_at,
      prescriptions ( medication, dosage, patients ( reg_number, profiles(full_name) ) ),
      pharmacy_stock ( medicine_name ),
      pharmacists ( profiles(full_name) )
    `)
    .order("dispensed_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Dispenses a prescription: decrements stock quantity, logs the dispense,
 * and marks the prescription 'dispensed'. Runs as three sequential calls
 * (not a single DB transaction, since the anon/browser client can't open
 * one) — each step is checked, and stock is only decremented after the
 * stock row's current quantity has been confirmed sufficient.
 */
export async function dispensePrescription({ prescriptionId, stockId, pharmacistId, quantity }) {
  const { data: stockRow, error: stockErr } = await supabase
    .from("pharmacy_stock").select("id, quantity").eq("id", stockId).single();
  if (stockErr) throw stockErr;
  if (stockRow.quantity < quantity) {
    throw new Error(`Only ${stockRow.quantity} units in stock — cannot dispense ${quantity}.`);
  }

  const { error: updateErr } = await supabase
    .from("pharmacy_stock").update({ quantity: stockRow.quantity - quantity }).eq("id", stockId);
  if (updateErr) throw updateErr;

  const { error: logErr } = await supabase.from("dispensing_records").insert({
    prescription_id: prescriptionId, stock_id: stockId, pharmacist_id: pharmacistId, quantity_dispensed: quantity,
  });
  if (logErr) throw logErr;

  const { error: rxErr } = await supabase
    .from("prescriptions").update({ status: "dispensed" }).eq("id", prescriptionId);
  if (rxErr) throw rxErr;

  return true;
}

export async function cancelPrescription(id) {
  const { error } = await supabase.from("prescriptions").update({ status: "cancelled" }).eq("id", id);
  if (error) throw error;
}
