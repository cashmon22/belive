-- Add rejection_reason and reviewed_at columns to payment_requests.
-- rejection_reason stores the admin's optional reason when rejecting a request.
-- reviewed_at records when the admin last changed the status.
alter table public.payment_requests
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz;

notify pgrst, 'reload schema';
