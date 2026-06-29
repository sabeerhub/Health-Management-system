# FUD Health HMS

A complete, role-based Hospital Management System for the Federal University Dutse Health Centre.
Vanilla HTML/CSS/JS (ES6 modules) + Supabase (Postgres, Auth, Storage, RLS) + Korapay (test mode) + Vercel.

## 🔒 Authentication & RBAC architecture

This is the most important structural fact about the project, so it's first. As of the latest
revision, this uses **one shared login page for every role** rather than separate hidden URLs per
role (an earlier version of this build used hidden per-role login URLs; that approach was replaced
because URL secrecy was never the real security boundary anyway — see below):

- **One login, every role**: `/pages/login.html` is the only sign-in page in the entire app. A
  patient, doctor, pharmacist, or admin all authenticate at the exact same URL with email + password.
- **Role comes from the database, never the client**: after a successful sign-in, `login()` in
  `assets/js/auth.js` reads the account's `role` straight from the `profiles` table and redirects
  accordingly — `admin` → `/pages/admin/dashboard.html`, `doctor` → `/pages/doctor/dashboard.html`,
  `pharmacist` → `/pages/pharmacist/dashboard.html`, `patient` → `/pages/patient/dashboard.html`.
  Nothing about which dashboard a user lands on is ever decided by anything the browser sends.
- **Patients self-register; staff never do.** `/pages/register.html` is patient-only — the
  `handle_new_user` trigger in `database/schema.sql` hard-codes `role = 'patient'` for anything
  created through that flow, regardless of what a tampered client might claim. Doctor and
  Pharmacist accounts are created exclusively by an admin (via the Doctors/Staff pages in the
  admin dashboard), which calls a service-role Edge Function — there is no staff registration
  page anywhere, by design.
- **Wrong-role access redirects to that account's OWN dashboard, not a login screen.**
  `requireRole(role)` runs at the top of every protected page. No session at all → the shared
  login page. A valid session under a *different* role → that account's real dashboard — e.g. a
  patient session hitting `/pages/admin/dashboard.html` is sent to
  `/pages/patient/dashboard.html`, not bounced back to sign in again.
- **Frontend checks are a UX convenience, not the actual security boundary** — and this is true
  regardless of which of the two URL strategies above is used. The real enforcement is server-side:
  - **Row Level Security** policies on every table in `database/schema.sql` decide what each
    authenticated role can read or write, checked by Postgres on every single query.
  - A **`prevent_role_change` trigger** blocks any client — even a logged-in admin's own session —
    from changing a profile's `role` column unless the request carries the service-role key, which
    only ever happens inside the staff-creation Edge Functions.
  - **Service-role Edge Functions** (`admin-create-staff`, `admin-delete-staff`, `verify-payment`)
    independently re-check `profiles.role === 'admin'` server-side before doing anything privileged,
    on top of whatever the frontend already checked.

  Because of this, even if `requireRole()` were bypassed entirely (browser dev tools, a buggy
  redirect, anything), no actual protected data becomes reachable — every real data request still
  has to pass RLS, and every privileged action still has to pass its Edge Function's own role check.
  A true page-level HTTP 403 isn't possible here in the literal sense, since this is a static site
  with no server process to intercept the request before the HTML is served — but the practical
  effect is the same: the wrong-role page never renders its content, and no API call it could make
  would succeed anyway.

## ✅ What's built — all 4 roles, fully wired to real Supabase queries

- **Public**: redesigned landing page (Hero / Features / Hospital Services / Benefits / Statistics /
  CTA / Footer), one shared login, patient registration with a live password-strength meter and
  reg-number validation
- **Admin**: dashboard stats, Add/Delete Doctor, Add/Delete Pharmacist, patient directory + history
  viewer, all-appointments oversight, all-payments view (manual re-verify, receipts), settings
- **Doctor**: dashboard, patient directory + add diagnosis/notes, appointment approve/cancel/complete,
  create & track prescriptions
- **Pharmacist**: dashboard with low-stock alerts, stock CRUD, real stock-decrementing dispense flow,
  dispensing history
- **Patient**: dashboard, editable profile, book/cancel appointments, real Korapay checkout + payment
  history + printable receipts, medical history, prescription list

Every icon in the app comes from one system: real **Lucide icons**, loaded via CDN and rendered
through `components/icons.js` (`icon("calendar")` → `<i data-lucide="calendar">`). A `MutationObserver`
in that file automatically calls `lucide.createIcons()` whenever the DOM changes, so icons render
correctly even in content injected dynamically (tables, modals, stat cards) — no page has to
remember to call a refresh function itself. The only hand-drawn SVG left anywhere is the FUD Health
shield logo mark, which is brand art, not a system icon.

## Fixing "my CSS isn't loading" on Vercel

This is almost never a code bug in this project — every stylesheet link is root-relative
(`/assets/css/...`), which only resolves correctly when `index.html` is served from your domain's
**actual root**. The two real causes, in order of likelihood:

1. **Vercel "Root Directory" is wrong.** If you pushed this whole `fud-hms/` folder as a subfolder
   of a bigger repo (or the zip's top-level folder ended up committed as-is), Vercel is serving
   `index.html` from `yourdomain.com/`, but your CSS lives at `yourdomain.com/fud-hms/assets/...` —
   a 404. Fix: in Vercel → Project Settings → General → **Root Directory**, set it to the folder
   that directly contains `index.html` (e.g. `fud-hms`), or flatten the repo so `index.html` sits at
   the repo root.
2. **Testing by double-clicking the HTML file** (`file://...`) instead of serving it. Root-relative
   paths don't resolve over `file://`. Run `npx serve .` from the project root, or push to Vercel.

`vercel.json` is included with explicit static-site settings (`cleanUrls: false`, since every link
in this project points to a literal `.html` file) and asset caching headers.

**One correction to the paragraph above**: this project now has a tiny build step (added when we
switched to environment-variable-based config instead of hardcoding keys) — see step 3 below.
`vercel.json` sets `buildCommand: npm run build`, which runs `scripts/generate-config.js`.

## Setup (in order)

1. Create a free project at supabase.com.
2. SQL Editor → paste in `database/schema.sql` → Run. Creates all 10 tables, RLS policies, and the
   new-user/role-protection triggers.
3. In Vercel → Project Settings → Environment Variables, add:
   - `SUPABASE_URL` — your Project URL from Supabase → Settings → API
   - `SUPABASE_ANON_KEY` — your anon/public key from the same page
   - `KORAPAY_PUBLIC_KEY` — once you have it (step 7) — optional until then, the build falls back
     to a placeholder if it's not set yet
   These get read by `scripts/generate-config.js` at build time to generate `assets/js/config.js`
   — that file is gitignored on purpose and never committed with real keys.
4. Redeploy (or push any commit) so Vercel runs the build with those variables available. Then go
   to `/pages/register.html` on your live site to create your own patient account.
5. In SQL Editor, run: `update public.profiles set role = 'admin' where email = 'your@email.com';`
   You're now an admin — sign in again at `/pages/login.html` with that same account and you'll
   land on the admin dashboard automatically. Use it from here on to create Doctor/Pharmacist
   accounts; each creation shows you a sign-in link to pass along (same shared `/pages/login.html`
   URL — the account's role determines where it lands, not the URL).
6. Install the Supabase CLI, run `supabase login` and `supabase link` to connect it to this project,
   then deploy the four Edge Functions (now correctly laid out under `supabase/functions/<name>/index.ts`,
   which is the structure the CLI actually expects — and also out of Vercel's reserved `/api` path,
   which was causing harmless-but-noisy TypeScript errors in the Vercel build log):
   ```
   supabase functions deploy admin-create-staff
   supabase functions deploy admin-delete-staff
   supabase functions deploy verify-payment
   supabase functions deploy korapay-webhook --no-verify-jwt
   ```
   Set secrets: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... KORAPAY_SECRET_KEY=sk_test_...`
7. Get a free Korapay test account, add your **public** key (`pk_test_...`) as the `KORAPAY_PUBLIC_KEY`
   environment variable in Vercel (same place as step 3) and redeploy. The webhook URL is sent
   per-transaction (see `notification_url` in `assets/js/korapay.js`), so you do **not** need to
   touch Korapay's account-wide webhook setting — this works safely even on a Korapay account
   that's also used by other unrelated projects.
8. That's it — every push to `main` redeploys automatically via Vercel.

## Project structure

```
/                         landing page (public)
/pages/login.html        single shared login for ALL roles — redirects by account role after sign-in
/pages/register.html     patient self-registration (public; staff never self-register)
/pages/admin/*.html       dashboard, doctors, staff (pharmacists), patients, appointments, payments, settings
/pages/doctor/*.html      dashboard, patients, appointments, prescriptions
/pages/pharmacist/*.html  dashboard, stock, prescriptions
/pages/patient/*.html     dashboard, profile, book-appointment, history, payments, prescriptions
/components/              sidebar.js, topbar.js, layout.js, modal.js, icons.js (Lucide + auto-refresh)
/assets/css/              variables.css (design tokens), base.css, components.css
/assets/js/               config.js, supabaseClient.js, auth.js, validators.js, toast.js, korapay.js, receipt.js
/assets/js/api/           one module per domain — every real Supabase query lives here
/supabase/functions/      4 Supabase Edge Function templates (service-role operations)
/database/schema.sql      tables, relationships, RLS policies, security triggers
vercel.json               static-site config, no build step
```

## Security model, in one paragraph

Patients self-register and are **always** assigned the `patient` role server-side. A database
trigger (`prevent_role_change`) blocks any client from changing a profile's role unless the request
carries the service-role key, so role changes only ever happen inside the two staff Edge Functions.
Every login page checks the signed-in account's actual role against the role that page is for and
silently rejects mismatches with a generic error. Every protected page re-checks the live session's
role on load and bounces anything wrong back to a login screen, never another dashboard. Payment
status can only become `success` via the Korapay webhook or the admin verify-payment function (both
service-role, both re-verify with Korapay's API directly).

## Known limitations / honest caveats

- **Korapay script URL & webhook signature header** are implemented per their current public docs —
  if `openKorapayCheckout` throws a script-load error, check Korapay's current CDN snippet.
- **Receipts** are print-ready HTML (browser "Print → Save as PDF"), not a server-rendered PDF —
  zero extra dependencies, works offline, genuinely downloadable. Note the receipt window has its
  own `<head>` and doesn't load the Lucide CDN script, so its one icon is hand-drawn SVG.
- **Password reset is real**, not a stub: "Forgot password?" on every login page opens a modal,
  calls Supabase's actual `resetPasswordForEmail()`, and `/pages/reset-password.html` completes the
  flow using the recovery session Supabase auto-establishes from the email link. One thing to verify
  on your end: in Supabase Dashboard → Authentication → URL Configuration, add
  `https://yourdomain.com/pages/reset-password.html` to the allowed redirect URLs, or the email
  link will be rejected.
- **The real security boundary is server-side, not the login URL** — RLS policies plus the
  `prevent_role_change` trigger plus each Edge Function's own admin-role check. Knowing the
  (now single, public) login URL gives an attacker nothing without real credentials for an
  account that actually has the role they're after.
