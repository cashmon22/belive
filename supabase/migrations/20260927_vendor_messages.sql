-- Vendor + Support messaging system — IDEMPOTENT migration.
-- Safe to run multiple times. Does NOT drop tables or data.
-- Run this in the Supabase SQL Editor.

-- ============================================================
-- 1. Tables (create only if missing)
-- ============================================================

create table if not exists public.vendor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_type text not null default 'vendor' check (conversation_type in ('vendor', 'support')),
  payment_request_id uuid,
  device_id text,
  device_name text,
  device_model text,
  reference_number text,
  user_name text not null,
  user_email text not null,
  request_status text,
  status text not null default 'active' check (status in ('active', 'closed')),
  last_message text,
  last_message_at timestamptz,
  user_unread_count int not null default 0,
  admin_unread_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.vendor_conversations(id) on delete cascade,
  sender_id uuid not null,
  sender_role text not null check (sender_role in ('user', 'admin')),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. Columns (add only if missing — handles partial prior runs)
-- ============================================================

alter table public.vendor_conversations add column if not exists conversation_type text not null default 'vendor';
alter table public.vendor_conversations add column if not exists payment_request_id uuid;
alter table public.vendor_conversations add column if not exists device_id text;
alter table public.vendor_conversations add column if not exists device_name text;
alter table public.vendor_conversations add column if not exists device_model text;
alter table public.vendor_conversations add column if not exists reference_number text;
alter table public.vendor_conversations add column if not exists request_status text;
alter table public.vendor_conversations add column if not exists status text not null default 'active';
alter table public.vendor_conversations add column if not exists last_message text;
alter table public.vendor_conversations add column if not exists last_message_at timestamptz;
alter table public.vendor_conversations add column if not exists user_unread_count int not null default 0;
alter table public.vendor_conversations add column if not exists admin_unread_count int not null default 0;

alter table public.vendor_messages add column if not exists sender_id uuid;
alter table public.vendor_messages add column if not exists sender_role text;
alter table public.vendor_messages add column if not exists body text;
alter table public.vendor_messages add column if not exists read_at timestamptz;

-- ============================================================
-- 3. Indexes (idempotent)
-- ============================================================

create index if not exists vendor_conversations_user_id_idx on public.vendor_conversations (user_id);
create index if not exists vendor_conversations_payment_request_id_idx on public.vendor_conversations (payment_request_id);
create index if not exists vendor_conversations_last_message_at_idx on public.vendor_conversations (last_message_at desc);
create index if not exists vendor_conversations_conversation_type_idx on public.vendor_conversations (conversation_type);
create index if not exists vendor_messages_conversation_id_idx on public.vendor_messages (conversation_id, created_at asc);

create unique index if not exists vendor_conversations_vendor_unique
  on public.vendor_conversations (user_id, payment_request_id)
  where conversation_type = 'vendor';

create unique index if not exists vendor_conversations_support_unique
  on public.vendor_conversations (user_id)
  where conversation_type = 'support';

-- ============================================================
-- 4. updated_at trigger (idempotent)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vendor_conversations_updated_at on public.vendor_conversations;
create trigger vendor_conversations_updated_at
  before update on public.vendor_conversations
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 5. RLS — drop ALL existing policies dynamically, then recreate
--    This avoids any "policy already exists" error regardless of
--    what policies a prior partial run may have left behind.
-- ============================================================

alter table public.vendor_conversations enable row level security;
alter table public.vendor_messages enable row level security;

-- Drop every policy that currently exists on both tables
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('vendor_conversations', 'vendor_messages')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end
$$;

-- Recreate the correct policies from scratch
create policy "Users can view own conversations"
  on public.vendor_conversations for select
  using (auth.uid() = user_id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Users can create own conversations"
  on public.vendor_conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on public.vendor_conversations for update
  using (auth.uid() = user_id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Users can view own messages"
  on public.vendor_messages for select
  using (
    exists (
      select 1 from public.vendor_conversations c
      where c.id = vendor_messages.conversation_id
      and (c.user_id = auth.uid() or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    )
  );

create policy "Users can insert own messages"
  on public.vendor_messages for insert
  with check (
    sender_role = 'user' and sender_id = auth.uid()
    and exists (
      select 1 from public.vendor_conversations c
      where c.id = vendor_messages.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Admins can insert messages"
  on public.vendor_messages for insert
  with check (
    sender_role = 'admin'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Users can update read status on own messages"
  on public.vendor_messages for update
  using (
    exists (
      select 1 from public.vendor_conversations c
      where c.id = vendor_messages.conversation_id
      and (c.user_id = auth.uid() or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    )
  );

-- ============================================================
-- 6. Realtime publication (add only if not already a member)
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'vendor_conversations'
  ) then
    alter publication supabase_realtime add table public.vendor_conversations;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'vendor_messages'
  ) then
    alter publication supabase_realtime add table public.vendor_messages;
  end if;
end
$$;

-- ============================================================
-- 7. Reload PostgREST schema cache
-- ============================================================

notify pgrst, 'reload schema';
