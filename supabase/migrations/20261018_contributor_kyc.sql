create table if not exists public.contributor_kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
  consent_at timestamptz,
  id_type text,
  id_image_path text,
  selfie_image_path text,
  identity_information jsonb not null default '{}'::jsonb,
  quality_flags jsonb not null default '[]'::jsonb,
  capture_confirmations jsonb not null default '{}'::jsonb,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contributor_kyc_user_created_idx
  on public.contributor_kyc_submissions (user_id, created_at desc);
create index if not exists contributor_kyc_status_created_idx
  on public.contributor_kyc_submissions (status, submitted_at desc);
create unique index if not exists contributor_kyc_one_active_submission_idx
  on public.contributor_kyc_submissions (user_id)
  where status in ('draft', 'pending');

create table if not exists public.contributor_kyc_instructions (
  id boolean primary key default true check (id),
  instructions text not null default 'Use a clear, current government-issued identity document. Photograph the full document in good lighting, then enter the information exactly as it appears.',
  accepted_id_types jsonb not null default '[{"id":"national_id","label":"National ID","instructions":"Use a valid national identity card."},{"id":"passport","label":"International Passport","instructions":"Use the photo and information page of a valid passport."},{"id":"drivers_licence","label":"Driver’s Licence","instructions":"Use a valid driver’s licence."},{"id":"voters_card","label":"Voter’s Card","instructions":"Use only where accepted by local law and policy."}]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.contributor_kyc_instructions (id) values (true) on conflict (id) do nothing;

alter table public.contributor_kyc_submissions enable row level security;
alter table public.contributor_kyc_instructions enable row level security;
revoke all on public.contributor_kyc_submissions from anon, authenticated;
revoke all on public.contributor_kyc_instructions from anon, authenticated;
grant all on public.contributor_kyc_submissions, public.contributor_kyc_instructions to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contributor-kyc', 'contributor-kyc', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Contributors upload own KYC files" on storage.objects;
create policy "Contributors upload own KYC files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'contributor-kyc'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Contributors read own KYC files" on storage.objects;
create policy "Contributors read own KYC files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'contributor-kyc'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Admins read KYC files" on storage.objects;
create policy "Admins read KYC files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'contributor-kyc'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

notify pgrst, 'reload schema';
