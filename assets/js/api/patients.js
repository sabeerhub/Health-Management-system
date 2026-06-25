// ==========================================================================
// FUD HEALTH HMS — PATIENTS API
// ==========================================================================

import { supabase } from "../supabaseClient.js";

export async function listPatients() {
  const { data, error } = await supabase
    .from("patients")
    .select("id, reg_number, faculty, department, dob, gender, created_at, profiles(full_name, email, phone)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function searchPatients(query) {
  if (!query) return listPatients();
  // Search by reg number directly, and by name via the embedded profile.
  const { data, error } = await supabase
    .from("patients")
    .select("id, reg_number, faculty, department, profiles(full_name, email, phone)")
    .or(`reg_number.ilike.%${query}%`);
  if (error) throw error;

  // Client-side filter on name too, since PostgREST can't ilike a
  // related-table column inside an .or() in the same call.
  const { data: all } = await supabase
    .from("patients")
    .select("id, reg_number, faculty, department, profiles(full_name, email, phone)");
  const byName = (all || []).filter(p =>
    p.profiles?.full_name?.toLowerCase().includes(query.toLowerCase())
  );

  const merged = [...(data || []), ...byName];
  const seen = new Set();
  return merged.filter(p => (seen.has(p.id) ? false : seen.add(p.id)));
}

export async function getPatientProfile(patientId) {
  const { data, error } = await supabase
    .from("patients")
    .select("*, profiles(full_name, email, phone, avatar_url)")
    .eq("id", patientId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateMyPatientProfile(patientId, { fullName, phone, faculty, department, dob, gender, address }) {
  const updates = [];
  if (fullName !== undefined || phone !== undefined) {
    updates.push(supabase.from("profiles").update({
      ...(fullName !== undefined ? { full_name: fullName } : {}),
      ...(phone !== undefined ? { phone } : {}),
    }).eq("id", patientId));
  }
  updates.push(supabase.from("patients").update({
    ...(faculty !== undefined ? { faculty } : {}),
    ...(department !== undefined ? { department } : {}),
    ...(dob !== undefined ? { dob } : {}),
    ...(gender !== undefined ? { gender } : {}),
    ...(address !== undefined ? { address } : {}),
  }).eq("id", patientId));

  const results = await Promise.all(updates);
  const failed = results.find(r => r.error);
  if (failed) throw failed.error;
  return true;
}
