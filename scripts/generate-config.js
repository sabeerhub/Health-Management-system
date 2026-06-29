// ==========================================================================
// FUD HEALTH HMS — CONFIG GENERATOR
// Runs at build time on Vercel (and optionally locally). Reads real values
// from environment variables and writes assets/js/config.js, which is
// gitignored — the real keys never touch the git history.
// ==========================================================================

const fs = require("fs");
const path = require("path");

const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
const missing = required.filter((k) => !process.env[k]);

if (missing.length) {
  console.error(`\n❌ Missing required environment variable(s): ${missing.join(", ")}`);
  console.error("Set these in Vercel → Project Settings → Environment Variables, then redeploy.");
  console.error("(For local builds: export them in your shell before running `npm run build`.)\n");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const KORAPAY_PUBLIC_KEY = process.env.KORAPAY_PUBLIC_KEY || "pk_test_YOUR_KORAPAY_PUBLIC_KEY";

const output = `// ==========================================================================
// FUD HEALTH HMS — CONFIG
// AUTO-GENERATED at build time from environment variables — do not edit by
// hand. Edit scripts/generate-config.js or your Vercel env vars instead;
// this file is overwritten on every build and is gitignored on purpose.
// ==========================================================================

export const SUPABASE_URL = ${JSON.stringify(SUPABASE_URL)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(SUPABASE_ANON_KEY)};

// Korapay PUBLIC key only (starts with pk_test_ in test mode). The secret
// key is used server-side only, inside the verify-payment Edge Function —
// it must never appear in this file or anywhere in the browser.
export const KORAPAY_PUBLIC_KEY = ${JSON.stringify(KORAPAY_PUBLIC_KEY)};

export const APP_NAME = "FUD Health HMS";
export const REG_NUMBER_REGEX = /^FCP\\/[A-Z]{2,5}\\/\\d{2}\\/\\d{4}$/;

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

// One shared login for every role — the page authenticates first, then
// reads the account's role from the database and redirects accordingly.
export const LOGIN_URL = "/pages/login.html";
`;

const outPath = path.join(__dirname, "..", "assets", "js", "config.js");
fs.writeFileSync(outPath, output);
console.log(`✅ Generated ${outPath} from environment variables.`);
