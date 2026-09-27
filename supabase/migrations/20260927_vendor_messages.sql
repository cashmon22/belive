-- Vendor messaging system: conversations and messages between users and the Trusted Vendor (admin).
-- One conversation per (user_id, payment_request_id) pair — no duplicates.

create table if not exists public.vendor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_request_id uuid not null,
  device_id text not null,
  device_name text not null,
  device_model text not null,
  reference_number text not null,
  user_name text not null,
  user_email text not null,
  request_status text not null default 'Under Review',
  status text not null default 'active' check (status in ('active', 'closed')),
  last_message text,
  last_message_at timestamptz,
  user_unread_count int not null default 0,
  admin_unread_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, payment_request_id)
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

create index if not exists vendor_conversations_user_id_idx on public.vendor_conversations (user_id);
create index if not exists vendor_conversations_payment_request_id_idx on public.vendor_conversations (payment_request_id);
create index if not exists vendor_conversations_last_message_at_idx on public.vendor_conversations (last_message_at desc);
create index if not exists vendor_messages_conversation_id_idx on public.vendor_messages (conversation_id, created_at asc);

alter table public.vendor_conversations enable row level security;
alter table public.vendor_messages enable row level security;

-- Conversations: users see their own, admins see all
create policy "Users can view own conversations"
  on public.vendor_conversations for select
  using (auth.uid() = user_id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Users can create own conversations"
  on public.vendor_conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on public.vendor_conversations for update
  using (auth.uid() = user_id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Messages: users see messages in their own conversations, admins see all
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

notify pgrst, 'reload schema';
