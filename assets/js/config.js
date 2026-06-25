// ==========================================================================
// FUD HEALTH HMS — CONFIG
// Replace the placeholder values below with your real project credentials.
// Never put a SERVICE ROLE key or a Korapay SECRET key in frontend code —
// those belong on the server (Supabase Edge Function), never in the browser.
// ==========================================================================

export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-OR-PUBLISHABLE-KEY";

// Korapay PUBLIC key only (starts with pk_test_ in test mode). The secret
// key is used server-side only, inside the verify-payment Edge Function.
export const KORAPAY_PUBLIC_KEY = "pk_test_YOUR_KORAPAY_PUBLIC_KEY";

export const APP_NAME = "FUD Health HMS";
export const REG_NUMBER_REGEX = /^FCP\/[A-Z]{2,5}\/\d{2}\/\d{4}$/;

export const ROLES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  PHARMACIST: "pharmacist",
  PATIENT: "patient",
};

export const ROLE_HOME = {
  admin: "/pages/admin/dashboard.html",
  doctor: "/pages/doctor/dashboard.html",
  pharmacist: "/pages/pharmacist/dashboard.html",
  patient: "/pages/patient/dashboard.html",
};

// Staff logins are intentionally NOT linked from any public page, nav, or
// footer — they're direct-URL-only. Only the public patient login lives at
// the discoverable /pages/login.html.
export const ROLE_LOGIN = {
  admin: "/pages/admin/login.html",
  doctor: "/pages/doctor/login.html",
  pharmacist: "/pages/pharmacist/login.html",
  patient: "/pages/login.html",
};
