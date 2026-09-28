-- Add verification_status column to the applications table.
-- Allows admins to mark applicants as Verified or Not Verified independently
-- from the review status (Under Review / Approved / Rejected).
alter table public.applications
  add column if not exists verification_status text not null default 'Not Verified';

-- Backfill existing rows.
update public.applications
  set verification_status = 'Not Verified'
  where verification_status is null;

-- Add a check constraint to ensure only valid values.
alter table public.applications
  add constraint applications_verification_status_check
  check (verification_status in ('Verified', 'Not Verified'));

notify pgrst, 'reload schema';
