create table if not exists public.contributor_earnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  available_balance numeric(10, 2) not null default 0,
  pending_earnings numeric(10, 2) not null default 0,
  total_withdrawn numeric(10, 2) not null default 0,
  payment_gateway_configured boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.contributor_earnings enable row level security;

drop policy if exists "Users can view their own earnings" on public.contributor_earnings;
create policy "Users can view their own earnings"
  on public.contributor_earnings for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own earnings" on public.contributor_earnings;
create policy "Users can update their own earnings"
  on public.contributor_earnings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create an earnings row for new users
create or replace function public.handle_new_contributor_earnings()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.contributor_earnings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_earnings on auth.users;
create trigger on_auth_user_created_earnings
  after insert on auth.users
  for each row execute function public.handle_new_contributor_earnings();

notify pgrst, 'reload schema';
