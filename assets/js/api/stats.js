// ==========================================================================
// FUD HEALTH HMS — DASHBOARD STATS API
// ==========================================================================

import { supabase } from "../supabaseClient.js?v2";

async function count(table, filters = {}) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { count: c, error } = await q;
  if (error) throw error;
  return c || 0;
}

export async function getAdminStats() {
  const [totalPatients, totalDoctors, totalPharmacists, totalAppointments, payments] = await Promise.all([
    count("patients"),
    count("doctors"),
    count("pharmacists"),
    count("appointments"),
    supabase.from("payments").select("amount").eq("status", "success"),
  ]);
  const totalRevenue = (payments.data || []).reduce((sum, p) => sum + Number(p.amount), 0);
  return { totalPatients, totalDoctors, totalPharmacists, totalAppointments, totalRevenue };
}

export async function getRecentActivity(limit = 6) {
  const { data: appts } = await supabase
    .from("appointments")
    .select("id, status, created_at, patients(profiles(full_name))")
    .order("created_at", { ascending: false })
    .limit(limit);
  return appts || [];
}

export async function getDoctorStats(doctorId) {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const [todayCount, pendingCount, totalPatientsRes] = await Promise.all([
    supabase.from("appointments").select("*", { count: "exact", head: true })
      .eq("doctor_id", doctorId).gte("scheduled_at", todayStart.toISOString()).lte("scheduled_at", todayEnd.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true })
      .eq("doctor_id", doctorId).eq("status", "pending"),
    supabase.from("appointments").select("patient_id").eq("doctor_id", doctorId),
  ]);

  const uniquePatients = new Set((totalPatientsRes.data || []).map(r => r.patient_id)).size;

  return {
    todayAppointments: todayCount.count || 0,
    pendingAppointments: pendingCount.count || 0,
    totalPatients: uniquePatients,
  };
}

export async function getPharmacistStats() {
  const [stockRes, activeRx] = await Promise.all([
    supabase.from("pharmacy_stock").select("id, quantity, reorder_level"),
    supabase.from("prescriptions").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const stock = stockRes.data || [];
  const lowStock = stock.filter(s => s.quantity <= s.reorder_level);
  return {
    totalMedicines: stock.length,
    lowStockCount: lowStock.length,
    activePrescriptions: activeRx.count || 0,
    lowStockItems: lowStock,
  };
}

export async function getPatientStats(patientId) {
  const [upcoming, prescriptionsRes, paymentsRes] = await Promise.all([
    supabase.from("appointments").select("*, doctors(specialty, profiles(full_name))")
      .eq("patient_id", patientId).in("status", ["pending", "approved"])
      .gte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }).limit(1),
    supabase.from("prescriptions").select("*", { count: "exact", head: true }).eq("patient_id", patientId).eq("status", "pending"),
    supabase.from("payments").select("amount, status").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1),
  ]);
  return {
    nextAppointment: (upcoming.data && upcoming.data[0]) || null,
    activePrescriptions: prescriptionsRes.count || 0,
    lastPayment: (paymentsRes.data && paymentsRes.data[0]) || null,
  };
}
