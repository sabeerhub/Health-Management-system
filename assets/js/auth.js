// ==========================================================================
// FUD HEALTH HMS — AUTH MODULE
// ==========================================================================

import { supabase } from "./supabaseClient.js";
import { ROLE_HOME, ROLE_LOGIN } from "./config.js";

/**
 * Registers a PATIENT account only. Staff accounts (doctor/pharmacist/admin)
 * are never created from this flow — see database/schema.sql: the
 * handle_new_user() trigger hard-codes role='patient' for anything created
 * through public sign-up, and admin-created staff go through a separate
 * service-role Edge Function instead. This means even a tampered client
 * request cannot grant itself a staff role.
 */
export async function registerPatient({
  email,
  password,
  fullName,
  regNumber,
  faculty,
  department,
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        reg_number: regNumber.toUpperCase(),
        faculty,
        department,
        // role is intentionally NOT trusted from here — the DB trigger
        // always assigns 'patient' for self-service sign-up.
      },
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Logs in AND enforces that the account's role matches the role this login
 * page is for. A patient hitting /pages/admin/login.html with valid patient
 * credentials is signed back out immediately and shown a generic error —
 * never "wrong portal, try X" (that would leak which roles exist for a
 * given email). This is what makes the hidden staff URLs actually safe to
 * rely on rather than just "security by obscurity".
 */
export async function loginAsRole({ email, password, expectedRole }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Invalid email or password.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    throw new Error("Invalid email or password.");
  }

  if (profile.role !== expectedRole) {
    await supabase.auth.signOut();
    throw new Error("Invalid email or password.");
  }

  return { user: data.user, profile };
}

export async function logout(role) {
  await supabase.auth.signOut();
  window.location.href = (role && ROLE_LOGIN[role]) || "/pages/login.html";
}

export async function getCurrentProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", sessionData.session.user.id)
    .single();
  if (error) return null;
  return profile;
}

/**
 * Call at the top of every protected dashboard page:
 *   await requireRole("doctor");
 * No session, or a session under the wrong role, both redirect to the
 * LOGIN page for that role — never to a dashboard. A patient session
 * hitting a doctor-only page must never be silently bounced to the
 * patient dashboard or any other authenticated surface; it goes back to
 * a sign-in screen, full stop.
 */
export async function requireRole(expectedRole) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== expectedRole) {
    window.location.href = ROLE_LOGIN[expectedRole] || "/pages/login.html";
    return null;
  }
  return profile;
}

export function redirectToRoleHome(role) {
  window.location.href = ROLE_HOME[role] || "/pages/login.html";
}

/**
 * Sends a real Supabase password-recovery email. The redirect URL points
 * at /pages/reset-password.html, which Supabase's client auto-detects the
 * recovery token from (supabaseClient.js already sets detectSessionInUrl:
 * true) — no manual token parsing needed.
 */
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/pages/reset-password.html`,
  });
  if (error) throw error;
}

/** Called from reset-password.html once the recovery session is active. */
export async function completePasswordReset(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
