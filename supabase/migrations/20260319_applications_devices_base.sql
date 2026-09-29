-- Base tables the app has always used but that were only created by hand.
-- Schema derived from server/routes/admin-applications.ts, client/lib/admin-applications.ts,
-- client/lib/admin-devices.ts, TrustedVendor/PaymentRequest pages and the payment-requests route.
-- Safe on existing databases: "if not exists" only; no data changed or dropped.
-- Sorts before 20260321_admin_applications_rls.sql so fresh installs work.
create extension if not exists pgcrypto;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null,
  created_at timestamptz not null default now(),
  status text not null default 'Under Review',
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text not null default '',
  country text not null default '',
  time_zone text not null default '',
  assignment_categories jsonb not null default '[]'::jsonb,
  weekly_hours text not null default '',
  previous_experience text not null default '',
  motivation text not null default '',
  age_18_plus boolean not null default false,
  reliable_internet boolean not null default false,
  follows_instructions boolean not null default false,
  agrees_policies boolean not null default false,
  understands_review boolean not null default false
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text not null default '',
  specifications text not null default '',
  amount numeric(10, 2),
  status text not null default 'Available',
  image_url text,
  created_at timestamptz not null default now()
);

notify pgrst, 'reload schema';
