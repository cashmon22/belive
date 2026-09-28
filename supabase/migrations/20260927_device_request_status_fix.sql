-- Fix device request status values and ensure rejection columns exist.
-- 1. Add rejection_reason and reviewed_at columns (in case prior migration was not applied).
-- 2. Migrate "Pending Review" records to "Under Review".
-- 3. Replace the CHECK constraint to use "Under Review" instead of "Pending Review".
-- 4. Update the column default.

alter table public.payment_requests
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz;

update public.payment_requests
  set status = 'Under Review'
  where status = 'Pending Review';

alter table public.payment_requests
  drop constraint if exists payment_requests_status_check;

alter table public.payment_requests
  add constraint payment_requests_status_check
  check (status in ('Under Review', 'Approved', 'Rejected', 'Completed'));

alter table public.payment_requests
  alter column status set default 'Under Review';

notify pgrst, 'reload schema';
