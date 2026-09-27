create table if not exists public.balance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10, 2) not null,
  type text not null check (type in ('Added', 'Removed')),
  previous_balance numeric(10, 2) not null,
  new_balance numeric(10, 2) not null,
  admin_id uuid not null references auth.users(id),
  admin_note text,
  created_at timestamptz not null default now()
);

alter table public.balance_transactions enable row level security;

drop policy if exists "Users can view their own balance transactions" on public.balance_transactions;
create policy "Users can view their own balance transactions"
  on public.balance_transactions for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can only SELECT their own transaction history — never INSERT/UPDATE/DELETE.
revoke insert, update, delete on public.balance_transactions from anon, authenticated;

create index if not exists balance_transactions_user_id_created_at_idx
  on public.balance_transactions (user_id, created_at desc);

-- Atomic balance adjustment function (callable only with service role)
create or replace function public.adjust_user_balance(
  target_user_id uuid,
  adjustment_amount numeric(10, 2),
  adjustment_type text,
  acting_admin_id uuid,
  admin_note text default null
)
returns public.balance_transactions
language plpgsql
security definer
as $$
declare
  current_balance numeric(10, 2);
  new_balance numeric(10, 2);
  transaction_record public.balance_transactions;
begin
  -- Lock the earnings row for this user
  select available_balance into current_balance
  from public.contributor_earnings
  where user_id = target_user_id
  for update;

  -- Create the earnings row if it doesn't exist yet
  if not found then
    insert into public.contributor_earnings (user_id)
    values (target_user_id)
    on conflict (user_id) do nothing;

    select available_balance into current_balance
    from public.contributor_earnings
    where user_id = target_user_id
    for update;
  end if;

  if current_balance is null then
    current_balance := 0;
  end if;

  if adjustment_type = 'Added' then
    new_balance := current_balance + adjustment_amount;
  elsif adjustment_type = 'Removed' then
    new_balance := current_balance - adjustment_amount;
    if new_balance < 0 then
      raise exception 'Insufficient balance: current balance is %, cannot remove %', current_balance, adjustment_amount;
    end if;
  else
    raise exception 'Invalid adjustment type: %', adjustment_type;
  end if;

  update public.contributor_earnings
  set available_balance = new_balance, updated_at = now()
  where user_id = target_user_id;

  insert into public.balance_transactions (user_id, amount, type, previous_balance, new_balance, admin_id, admin_note)
  values (target_user_id, adjustment_amount, adjustment_type, current_balance, new_balance, acting_admin_id, admin_note)
  returning * into transaction_record;

  return transaction_record;
end;
$$;

-- Restrict EXECUTE: only the service role (server-side admin API) can call this RPC.
-- Regular authenticated and anonymous users are explicitly blocked from calling it directly.
revoke execute on function public.adjust_user_balance(uuid, numeric, text, uuid, text) from anon, authenticated;
grant execute on function public.adjust_user_balance(uuid, numeric, text, uuid, text) to service_role;

notify pgrst, 'reload schema';
