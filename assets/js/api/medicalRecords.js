// ==========================================================================
// FUD HEALTH HMS — MEDICAL RECORDS API
// ==========================================================================

import { supabase } from "../supabaseClient.js?v2";

export async function listRecordsForPatient(patientId) {
  const { data, error } = await supabase
    .from("medical_records")
    .select("id, diagnosis, notes, created_at, doctors(specialty, profiles(full_name))")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addMedicalRecord({ patientId, doctorId, appointmentId, diagnosis, notes }) {
  const { data, error } = await supabase
    .from("medical_records")
    .insert({ patient_id: patientId, doctor_id: doctorId, appointment_id: appointmentId || null, diagnosis, notes })
    .select()
    .single();
  if (error) throw error;
  return data;
}
