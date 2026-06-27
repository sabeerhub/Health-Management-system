// ==========================================================================
// FUD HEALTH HMS — APPOINTMENTS API
// ==========================================================================

import { supabase } from "../supabaseClient.js?v2";

const SELECT_FULL = `
  id, scheduled_at, reason, status, notes, created_at,
  patients ( id, reg_number, profiles ( full_name, email, phone ) ),
  doctors ( id, specialty, profiles ( full_name ) )
`;

export async function listAllAppointments() {
  const { data, error } = await supabase
    .from("appointments").select(SELECT_FULL).order("scheduled_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listAppointmentsForDoctor(doctorId, { statusFilter } = {}) {
  let q = supabase.from("appointments").select(SELECT_FULL).eq("doctor_id", doctorId);
  if (statusFilter) q = q.eq("status", statusFilter);
  const { data, error } = await q.order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listAppointmentsForPatient(patientId) {
  const { data, error } = await supabase
    .from("appointments").select(SELECT_FULL).eq("patient_id", patientId)
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function bookAppointment({ patientId, doctorId, scheduledAt, reason }) {
  const { data, error } = await supabase
    .from("appointments")
    .insert({ patient_id: patientId, doctor_id: doctorId || null, scheduled_at: scheduledAt, reason, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function approveAppointment(id) {
  const { error } = await supabase.from("appointments").update({ status: "approved" }).eq("id", id);
  if (error) throw error;
}

export async function completeAppointment(id) {
  const { error } = await supabase.from("appointments").update({ status: "completed" }).eq("id", id);
  if (error) throw error;
}

export async function cancelAppointment(id) {
  const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
  if (error) throw error;
}

/** For the patient booking form: every doctor + specialty, for the <select>. */
export async function listBookableDoctors() {
  const { data, error } = await supabase
    .from("doctors").select("id, specialty, profiles(full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
