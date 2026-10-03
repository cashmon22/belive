create table if not exists public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null check (char_length(trim(prompt)) between 5 and 1000),
  position integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.interview_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  applicant_name text not null,
  email text not null,
  status text not null default 'Under Review' check (status in ('Under Review', 'Approved', 'Rejected')),
  answers jsonb not null check (jsonb_typeof(answers) = 'array'),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

insert into public.interview_questions (prompt, position)
select seed.prompt, seed.position
from (values
  ('Tell us about your experience with online research, testing, or evaluation work.', 0),
  ('How do you ensure your work follows detailed instructions accurately?', 1),
  ('What interests you about participating in the contributor program?', 2)
) as seed(prompt, position)
where not exists (select 1 from public.interview_questions);

insert into public.interview_submissions (user_id, applicant_name, email, status, answers)
select distinct on (u.id)
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), u.email),
  u.email,
  'Approved',
  '[]'::jsonb
from auth.users u
join public.applications a on lower(a.email) = lower(u.email)
where a.status = 'Approved'
order by u.id, a.created_at desc
on conflict (user_id) do nothing;

alter table public.interview_questions enable row level security;
alter table public.interview_submissions enable row level security;
revoke all on public.interview_questions, public.interview_submissions from anon, authenticated;
grant all on public.interview_questions, public.interview_submissions to service_role;
