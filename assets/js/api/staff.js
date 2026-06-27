// ==========================================================================
// FUD HEALTH HMS — STAFF API (Doctors & Pharmacists)
// Listing reads directly from Postgres (RLS-protected, admin-only writes).
// Create/Delete go through Edge Functions because creating/deleting an
// auth.users row requires the service-role key, which must never reach
// the browser — supabase.functions.invoke() forwards the admin's own
// session token, and the function re-checks role server-side.
// ==========================================================================

import { supabase } from "../supabaseClient.js?v2";

export async function listDoctors() {
  const { data, error } = await supabase
    .from("doctors")
    .select("id, specialty, license_number, created_at, profiles(full_name, email, phone)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listPharmacists() {
  const { data, error } = await supabase
    .from("pharmacists")
    .select("id, license_number, created_at, profiles(full_name, email, phone)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createStaff({ email, password, fullName, role, specialty, licenseNumber }) {
  const { data, error } = await supabase.functions.invoke("admin-create-staff", {
    body: { email, password, fullName, role, specialty, licenseNumber },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function deleteStaff(userId) {
  const { data, error } = await supabase.functions.invoke("admin-delete-staff", {
    body: { userId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
