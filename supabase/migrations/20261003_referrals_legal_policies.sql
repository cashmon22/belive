create table if not exists public.contributor_referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.contributor_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'Pending' check (status in ('Pending', 'Successful', 'Rejected')),
  created_at timestamptz not null default now(),
  reward_transaction_id uuid references public.balance_transactions(id) on delete set null,
  check (referrer_user_id <> referred_user_id)
);

create index if not exists contributor_referrals_referrer_created_idx
  on public.contributor_referrals (referrer_user_id, created_at desc);

create unique index if not exists contributor_referrals_unique_reward_transaction_idx
  on public.contributor_referrals (reward_transaction_id)
  where reward_transaction_id is not null;

create or replace function public.validate_referral_reward_transaction()
returns trigger
language plpgsql
as $$
begin
  if new.reward_transaction_id is not null and not exists (
    select 1 from public.balance_transactions
    where id = new.reward_transaction_id and user_id = new.referrer_user_id and type = 'Added'
  ) then
    raise exception 'Referral rewards must reference an added balance transaction for the referrer';
  end if;
  return new;
end;
$$;

create trigger contributor_referral_reward_transaction_valid
  before insert or update of reward_transaction_id, referrer_user_id on public.contributor_referrals
  for each row execute function public.validate_referral_reward_transaction();

alter table public.applications
  add column if not exists referral_owner_user_id uuid references auth.users(id) on delete set null;

alter table public.contributor_referral_codes enable row level security;
alter table public.contributor_referrals enable row level security;
revoke all on public.contributor_referral_codes from anon, authenticated;
revoke all on public.contributor_referrals from anon, authenticated;
grant select on public.contributor_referral_codes to authenticated;
grant select on public.contributor_referrals to authenticated;

create policy "Contributors read own referral code"
  on public.contributor_referral_codes for select to authenticated
  using (user_id = auth.uid());

create policy "Contributors read own referrals"
  on public.contributor_referrals for select to authenticated
  using (referrer_user_id = auth.uid() or referred_user_id = auth.uid());

create table if not exists public.legal_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null check (policy_key in ('terms', 'privacy', 'cookies', 'contributor-agreement')),
  title text not null,
  content text not null,
  version integer not null check (version > 0),
  effective_date date not null,
  is_published boolean not null default false,
  acknowledgement_required boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (policy_key, version)
);

create table if not exists public.legal_policy_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_id uuid not null references public.legal_policies(id) on delete restrict,
  acknowledged_at timestamptz not null default now(),
  unique (user_id, policy_id)
);

alter table public.legal_policies enable row level security;
alter table public.legal_policy_acknowledgements enable row level security;
revoke all on public.legal_policies from anon, authenticated;
revoke all on public.legal_policy_acknowledgements from anon, authenticated;
grant select on public.legal_policies to anon, authenticated;
grant select on public.legal_policy_acknowledgements to authenticated;

create policy "Public can read published policies"
  on public.legal_policies for select to anon, authenticated
  using (is_published = true);

create policy "Users read own policy acknowledgements"
  on public.legal_policy_acknowledgements for select to authenticated
  using (user_id = auth.uid());

create policy "Users acknowledge published required policies"
  on public.legal_policy_acknowledgements for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.legal_policies
      where id = policy_id and is_published = true and acknowledgement_required = true
    )
  );

create or replace function public.prevent_published_policy_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.is_published then
    raise exception 'Published policy versions are immutable';
  end if;
  return new;
end;
$$;

create trigger legal_policies_published_immutable
  before update or delete on public.legal_policies
  for each row execute function public.prevent_published_policy_mutation();

notify pgrst, 'reload schema';
