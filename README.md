# FUD Health HMS

A complete, role-based Hospital Management System for the Federal University Dutse Health Centre.
Vanilla HTML/CSS/JS (ES6 modules) + Supabase (Postgres, Auth, Storage, RLS) + Korapay (test mode) + Vercel.

## 🔒 Public surface vs. staff surface

This is the most important structural fact about the project, so it's first:

- **Public** (linked from the landing page, nav, footer — discoverable by anyone):
  `/`, `/pages/login.html` (patient sign-in), `/pages/register.html` (patient sign-up).
- **Staff** (admin/doctor/pharmacist) **sign-in pages exist only at direct URLs** and are linked
  from **nowhere** public — not the landing page, not the nav, not the footer, not even each other:
  - `/pages/admin/login.html`
  - `/pages/doctor/login.html`
  - `/pages/pharmacist/login.html`

  Staff accounts are created exclusively by an admin (Doctors/Pharmacists pages in the admin
  dashboard), and the admin is shown that staff member's sign-in URL right after creating the
  account, to pass along directly. There is no "staff register" page anywhere — it doesn't exist.

- **Every login page is role-locked**, not just role-aware: `loginAsRole()` in `assets/js/auth.js`
  signs the user in, checks their `profiles.role` against the role the page is *for*, and if they
  don't match, signs them back out and shows a generic "Invalid email or password" — never a hint
  about which role the account actually has. A patient's valid credentials simply do not work on
  `/pages/admin/login.html`, and the error message doesn't reveal why.
- **Every protected dashboard page** calls `requireRole(role)` on load. No session, or a session
  under the wrong role, both redirect to that role's **login page** — never to another dashboard,
  never silently. A doctor session hitting `/pages/admin/dashboard.html` lands back on
  `/pages/admin/login.html`, not on the doctor dashboard.

## ✅ What's built — all 4 roles, fully wired to real Supabase queries

- **Public**: redesigned landing page (Hero / Features / Hospital Services / Benefits / Statistics /
  CTA / Footer — no portal cards, no staff exposure), patient login, patient registration with a
  live password-strength meter and reg-number validation
- **Admin**: dashboard stats, Add/Delete Doctor, Add/Delete Pharmacist (each shown the new staff
  member's hidden login URL), patient directory + history viewer, all-appointments oversight,
  all-payments view (manual re-verify, receipts), settings
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
in this project points to a literal `.html` file) and asset caching headers — no build step needed.

## Setup (in order)

1. Create a free project at supabase.com.
2. SQL Editor → paste in `database/schema.sql` → Run. Creates all 10 tables, RLS policies, and the
   new-user/role-protection triggers.
3. Project Settings → API → copy your Project URL and anon/public key into `assets/js/config.js`.
4. Serve the project locally (`npx serve .`) and go to `/pages/register.html` to create your own
   patient account.
5. In SQL Editor, run: `update public.profiles set role = 'admin' where email = 'your@email.com';`
   You're now an admin. **Bookmark `/pages/admin/login.html` directly** — it's not linked anywhere
   in the UI on purpose. Use the dashboard from here on to create Doctor/Pharmacist accounts; each
   creation shows you that staff member's own hidden login URL to pass along.
6. Install the Supabase CLI, deploy the four Edge Functions in `/api`:
   ```
   supabase functions deploy admin-create-staff
   supabase functions deploy admin-delete-staff
   supabase functions deploy verify-payment
   supabase functions deploy korapay-webhook --no-verify-jwt
   ```
   Set secrets: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... KORAPAY_SECRET_KEY=sk_test_...`
7. Get a free Korapay test account, put your **public** key (`pk_test_...`) in `config.js`, and set
   the `korapay-webhook` function's URL as your webhook URL in Korapay's test dashboard.
8. Deploy to Vercel (see Root Directory note above) or keep running `npx serve .` locally.

## Project structure

```
/                         landing page (public, no staff links anywhere)
/pages/login.html         patient login (public)
/pages/register.html      patient self-registration (public)
/pages/admin/login.html       hidden — admin sign-in, direct URL only
/pages/doctor/login.html      hidden — doctor sign-in, direct URL only
/pages/pharmacist/login.html  hidden — pharmacist sign-in, direct URL only
/pages/admin/*.html       dashboard, doctors, staff (pharmacists), patients, appointments, payments, settings
/pages/doctor/*.html      dashboard, patients, appointments, prescriptions
/pages/pharmacist/*.html  dashboard, stock, prescriptions
/pages/patient/*.html     dashboard, profile, book-appointment, history, payments, prescriptions
/components/              sidebar.js, topbar.js, layout.js, modal.js, icons.js (Lucide + auto-refresh)
/assets/css/              variables.css (design tokens), base.css, components.css
/assets/js/               config.js, supabaseClient.js, auth.js, validators.js, toast.js, korapay.js, receipt.js
/assets/js/api/           one module per domain — every real Supabase query lives here
/api/                     4 Supabase Edge Function templates (service-role operations)
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
- **Hidden staff URLs are obscurity, not the actual security boundary** — the real boundary is
  `loginAsRole()` + RLS + the `prevent_role_change` trigger. Even if someone guesses
  `/pages/admin/login.html`, they still can't get in without real admin credentials.
