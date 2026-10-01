create table if not exists public.contributor_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id text not null,
  status text not null default 'Started' check (status in ('Started', 'Completed')),
  created_at timestamptz not null default now()
);

create unique index if not exists contributor_tasks_one_active_assignment_idx
  on public.contributor_tasks (user_id, assignment_id)
  where status = 'Started';

create index if not exists contributor_tasks_user_created_idx
  on public.contributor_tasks (user_id, created_at desc);

alter table public.contributor_tasks enable row level security;

drop policy if exists "Contributors can view their own tasks" on public.contributor_tasks;
create policy "Contributors can view their own tasks"
  on public.contributor_tasks for select to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.contributor_tasks from anon, authenticated;
