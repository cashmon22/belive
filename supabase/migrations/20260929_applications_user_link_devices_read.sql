-- 1) Link applications to accounts so users can see their own status.
alter table public.applications add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists applications_submission_id_key on public.applications (submission_id);
create index if not exists applications_email_lower_idx on public.applications (lower(email));
create index if not exists applications_user_id_idx on public.applications (user_id);

-- 2) Contributors must be able to browse available devices (Trusted Vendor / Payment Request).
-- Before this, only admins could SELECT devices, so those pages were empty for normal users.
drop policy if exists "Authenticated users can view available devices" on public.devices;
create policy "Authenticated users can view available devices"
  on public.devices for select to authenticated
  using (status = 'Available');

-- 3) Device image bucket used by admin-devices.ts and TrustedVendor.tsx (public URLs).
insert into storage.buckets (id, name, public)
values ('device-images', 'device-images', true)
on conflict (id) do nothing;

drop policy if exists "Admins manage device images" on storage.objects;
create policy "Admins manage device images"
  on storage.objects for all to authenticated
  using (bucket_id = 'device-images' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'device-images' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

notify pgrst, 'reload schema';
