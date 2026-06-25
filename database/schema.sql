-- ==========================================================================
-- FUD HEALTH HMS — DATABASE SCHEMA (PostgreSQL / Supabase)
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: uses IF NOT EXISTS / DROP ... IF EXISTS guards.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 0. EXTENSIONS
-- --------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- --------------------------------------------------------------------------
-- 1. ENUM TYPES
-- --------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'doctor', 'pharmacist', 'patient');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('pending', 'approved', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prescription_status as enum ('pending', 'dispensed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'success', 'failed');
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------------------
-- 2. CORE TABLES
-- --------------------------------------------------------------------------

-- "users" requirement is satisfied by Supabase's built-in auth.users table
-- (handles password hashing, sessions, email confirmation). We never
-- duplicate it — instead `profiles` is a 1:1 public-facing extension of it.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        user_role not null default 'patient',
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.patients (
  id          uuid primary key references public.profiles(id) on delete cascade,
  reg_number  text not null unique,           -- FCP/CIT/24/0001
  faculty     text not null,
  department  text not null,
  dob         date,
  gender      text,
  address     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_patients_reg_number on public.patients (reg_number);

create table if not exists public.doctors (
  id              uuid primary key references public.profiles(id) on delete cascade,
  specialty       text,
  license_number  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.pharmacists (
  id              uuid primary key references public.profiles(id) on delete cascade,
  license_number  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.appointments (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  doctor_id     uuid references public.doctors(id) on delete set null,
  scheduled_at  timestamptz not null,
  reason        text,
  status        appointment_status not null default 'pending',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_appointments_patient on public.appointments (patient_id);
create index if not exists idx_appointments_doctor on public.appointments (doctor_id);

create table if not exists public.medical_records (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  doctor_id       uuid references public.doctors(id) on delete set null,
  appointment_id  uuid references public.appointments(id) on delete set null,
  diagnosis       text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_medrec_patient on public.medical_records (patient_id);

create table if not exists public.prescriptions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  doctor_id       uuid references public.doctors(id) on delete set null,
  appointment_id  uuid references public.appointments(id) on delete set null,
  medication      text not null,
  dosage          text not null,
  duration        text not null,
  notes           text,
  status          prescription_status not null default 'pending',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_prescriptions_patient on public.prescriptions (patient_id);
create index if not exists idx_prescriptions_status on public.prescriptions (status);

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.patients(id) on delete cascade,
  appointment_id      uuid references public.appointments(id) on delete set null,
  amount              numeric(12,2) not null,
  currency            text not null default 'NGN',
  korapay_reference   text unique,
  status              payment_status not null default 'pending',
  receipt_url         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_payments_patient on public.payments (patient_id);
create index if not exists idx_payments_reference on public.payments (korapay_reference);

create table if not exists public.pharmacy_stock (
  id              uuid primary key default gen_random_uuid(),
  medicine_name   text not null,
  quantity        integer not null default 0,
  unit            text not null default 'units',
  reorder_level   integer not null default 10,
  price           numeric(12,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.dispensing_records (
  id                    uuid primary key default gen_random_uuid(),
  prescription_id       uuid not null references public.prescriptions(id) on delete cascade,
  pharmacist_id         uuid references public.pharmacists(id) on delete set null,
  stock_id              uuid references public.pharmacy_stock(id) on delete set null,
  quantity_dispensed    integer not null,
  dispensed_at          timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- 3. updated_at AUTO-MAINTENANCE
-- --------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','patients','doctors','pharmacists','appointments',
                            'medical_records','prescriptions','payments','pharmacy_stock',
                            'dispensing_records']
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format('create trigger trg_set_updated_at before update on public.%I
                     for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- 4. NEW-USER TRIGGER — patient self-registration only
--
-- This fires for EVERY new row in auth.users, including ones created by
-- the admin "create staff" Edge Function (service role). It must not
-- clobber a profile a server-side function is about to set up explicitly,
-- so it only acts when the metadata clearly came from the public patient
-- sign-up form (presence of reg_number) and otherwise leaves a minimal
-- 'patient' stub that the Edge Function pattern below overwrites.
--
-- SECURITY NOTE: role is NEVER read from client-supplied metadata. Public
-- sign-up always results in role = 'patient', full stop.
-- --------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'patient'
  )
  on conflict (id) do nothing;

  if new.raw_user_meta_data->>'reg_number' is not null then
    insert into public.patients (id, reg_number, faculty, department)
    values (
      new.id,
      upper(new.raw_user_meta_data->>'reg_number'),
      coalesce(new.raw_user_meta_data->>'faculty', ''),
      coalesce(new.raw_user_meta_data->>'department', '')
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------------------
-- 5. HELPER: current user's role (used heavily in RLS policies below)
-- --------------------------------------------------------------------------
create or replace function public.current_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- --------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- --------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.patients            enable row level security;
alter table public.doctors             enable row level security;
alter table public.pharmacists         enable row level security;
alter table public.appointments        enable row level security;
alter table public.medical_records     enable row level security;
alter table public.prescriptions       enable row level security;
alter table public.payments            enable row level security;
alter table public.pharmacy_stock      enable row level security;
alter table public.dispensing_records  enable row level security;

-- profiles --------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.current_role() = 'admin'
                     or public.current_role() in ('doctor','pharmacist')); -- staff need names

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- SECURITY: the policy above lets a user update THEIR OWN row (needed so
-- patients can edit their name/phone), but on its own it would also let
-- them change their own `role` column to 'admin'. This trigger closes that
-- gap: a role change is only allowed when the request comes in on the
-- service-role key (auth.role() = 'service_role'), i.e. only from the
-- admin-create-staff / admin-delete-staff Edge Functions, never a browser.
create or replace function public.prevent_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role <> old.role and auth.role() <> 'service_role' then
    raise exception 'Role changes are not permitted from the client.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_change on public.profiles;
create trigger trg_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- patients ----------------------------------------------------------------
drop policy if exists "patients_select" on public.patients;
create policy "patients_select" on public.patients
  for select using (
    id = auth.uid()
    or public.current_role() in ('admin','doctor','pharmacist')
  );

drop policy if exists "patients_update_own_or_admin" on public.patients;
create policy "patients_update_own_or_admin" on public.patients
  for update using (id = auth.uid() or public.current_role() = 'admin');

-- doctors -------------------------------------------------------------------
drop policy if exists "doctors_select_all_authenticated" on public.doctors;
create policy "doctors_select_all_authenticated" on public.doctors
  for select using (auth.uid() is not null); -- patients need the list to book

drop policy if exists "doctors_admin_write" on public.doctors;
create policy "doctors_admin_write" on public.doctors
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- pharmacists -----------------------------------------------------------
drop policy if exists "pharmacists_select_own_or_admin" on public.pharmacists;
create policy "pharmacists_select_own_or_admin" on public.pharmacists
  for select using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "pharmacists_admin_write" on public.pharmacists;
create policy "pharmacists_admin_write" on public.pharmacists
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- appointments ------------------------------------------------------------
drop policy if exists "appointments_select" on public.appointments;
create policy "appointments_select" on public.appointments
  for select using (
    patient_id = auth.uid()
    or doctor_id = auth.uid()
    or public.current_role() = 'admin'
  );

drop policy if exists "appointments_insert_patient" on public.appointments;
create policy "appointments_insert_patient" on public.appointments
  for insert with check (patient_id = auth.uid());

drop policy if exists "appointments_update" on public.appointments;
create policy "appointments_update" on public.appointments
  for update using (
    patient_id = auth.uid()       -- patient can cancel their own
    or doctor_id = auth.uid()     -- doctor can approve/cancel/complete
    or public.current_role() = 'admin'
  );

-- medical_records -----------------------------------------------------------
drop policy if exists "medrec_select" on public.medical_records;
create policy "medrec_select" on public.medical_records
  for select using (
    patient_id = auth.uid()
    or doctor_id = auth.uid()
    or public.current_role() = 'admin'
  );

drop policy if exists "medrec_write_doctor_admin" on public.medical_records;
create policy "medrec_write_doctor_admin" on public.medical_records
  for all using (public.current_role() in ('doctor','admin'))
  with check (public.current_role() in ('doctor','admin'));

-- prescriptions ---------------------------------------------------------
drop policy if exists "prescriptions_select" on public.prescriptions;
create policy "prescriptions_select" on public.prescriptions
  for select using (
    patient_id = auth.uid()
    or doctor_id = auth.uid()
    or public.current_role() in ('admin','pharmacist')
  );

drop policy if exists "prescriptions_insert_doctor" on public.prescriptions;
create policy "prescriptions_insert_doctor" on public.prescriptions
  for insert with check (public.current_role() in ('doctor','admin'));

drop policy if exists "prescriptions_update_doctor_pharmacist_admin" on public.prescriptions;
create policy "prescriptions_update_doctor_pharmacist_admin" on public.prescriptions
  for update using (public.current_role() in ('doctor','pharmacist','admin'));

-- payments ------------------------------------------------------------------
-- Patients may only INSERT a 'pending' row and READ their own payments.
-- Only the service role (Korapay webhook Edge Function) may flip a payment
-- to 'success'/'failed' — there is deliberately NO client-side update
-- policy, so "never trust frontend payment status" is enforced at the DB.
drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin" on public.payments
  for select using (patient_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "payments_insert_own_pending" on public.payments;
create policy "payments_insert_own_pending" on public.payments
  for insert with check (patient_id = auth.uid() and status = 'pending');

-- pharmacy_stock ----------------------------------------------------------
drop policy if exists "stock_select_staff" on public.pharmacy_stock;
create policy "stock_select_staff" on public.pharmacy_stock
  for select using (public.current_role() in ('pharmacist','admin','doctor'));

drop policy if exists "stock_write_pharmacist_admin" on public.pharmacy_stock;
create policy "stock_write_pharmacist_admin" on public.pharmacy_stock
  for all using (public.current_role() in ('pharmacist','admin'))
  with check (public.current_role() in ('pharmacist','admin'));

-- dispensing_records --------------------------------------------------------
drop policy if exists "dispensing_select" on public.dispensing_records;
create policy "dispensing_select" on public.dispensing_records
  for select using (public.current_role() in ('pharmacist','admin'));

drop policy if exists "dispensing_insert_pharmacist" on public.dispensing_records;
create policy "dispensing_insert_pharmacist" on public.dispensing_records
  for insert with check (public.current_role() in ('pharmacist','admin'));

-- --------------------------------------------------------------------------
-- 7. SEED: make yourself the first admin (run manually, once)
-- --------------------------------------------------------------------------
-- 1) Sign up normally through /pages/register.html with any email — this
--    creates an auth.users row + a 'patient' profile via the trigger.
-- 2) Then run this, swapping in that email, to promote yourself to admin:
--
--    update public.profiles set role = 'admin' where email = 'you@fud.edu.ng';
--
-- From then on, use the Admin dashboard's "Add Doctor / Add Pharmacist"
-- forms (backed by the service-role Edge Function in /api) to create staff.
