// ==========================================================================
// FUD HEALTH HMS — PHARMACY STOCK API
// ==========================================================================

import { supabase } from "../supabaseClient.js?v2";

export async function listStock() {
  const { data, error } = await supabase.from("pharmacy_stock").select("*").order("medicine_name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addMedicine({ medicineName, quantity, unit, reorderLevel, price }) {
  const { data, error } = await supabase.from("pharmacy_stock").insert({
    medicine_name: medicineName, quantity, unit, reorder_level: reorderLevel, price,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateStock(id, { quantity, unit, reorderLevel, price, medicineName }) {
  const updates = {};
  if (quantity !== undefined) updates.quantity = quantity;
  if (unit !== undefined) updates.unit = unit;
  if (reorderLevel !== undefined) updates.reorder_level = reorderLevel;
  if (price !== undefined) updates.price = price;
  if (medicineName !== undefined) updates.medicine_name = medicineName;
  const { error } = await supabase.from("pharmacy_stock").update(updates).eq("id", id);
  if (error) throw error;
}

export async function removeMedicine(id) {
  const { error } = await supabase.from("pharmacy_stock").delete().eq("id", id);
  if (error) throw error;
}
