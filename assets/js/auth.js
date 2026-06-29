// ==========================================================================
// FUD HEALTH HMS — AUTH MODULE
// ==========================================================================

import { supabase } from "./supabaseClient.js?v2";
import { ROLE_HOME, LOGIN_URL } from "./config.js?v2";

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
 * Single shared login for every role. Authenticates, then reads back
 * whatever role the account actually has from `profiles` — the caller
 * (the login page) redirects based on that. The role itself is never
 * trusted from anything the client sends; it's only ever read from the
 * database row, which only service-role Edge Functions or the
 * prevent_role_change-protected self-update path can ever modify.
 */
export async function login({ email, password }) {
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

  return { user: data.user, profile };
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = LOGIN_URL;
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
 * No session at all → the shared login page (nothing to send them "back"
 * to). A valid session under a DIFFERENT role → that account's own
 * dashboard, not a login screen — e.g. a patient session hitting
 * /pages/admin/dashboard.html lands on /pages/patient/dashboard.html
 * instead. Either way the protected page's own content never renders for
 * the wrong role — and even if this check were somehow bypassed, every
 * actual data request still goes through Postgres Row-Level Security and
 * service-role-only Edge Functions, so no protected data is reachable
 * regardless of what the frontend does.
 */
export async function requireRole(expectedRole) {
  const profile = await getCurrentProfile();
  if (!profile) {
    window.location.href = LOGIN_URL;
    return null;
  }
  if (profile.role !== expectedRole) {
    window.location.href = ROLE_HOME[profile.role] || LOGIN_URL;
    return null;
  }
  return profile;
}

export function redirectToRoleHome(role) {
  window.location.href = ROLE_HOME[role] || LOGIN_URL;
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
