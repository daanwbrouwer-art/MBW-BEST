-- Premium granted by us, without a store purchase (Play reviewers, testers).
-- The app treats a live row as an active subscription on sign-in.
-- Rows are added by the project owner only (dashboard / SQL); users can read
-- their own row and nothing else, and can never write.
create table public.premium_grants (
  user_id uuid primary key references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  granted_at timestamptz not null default now(),
  note text
);

alter table public.premium_grants enable row level security;

revoke all on public.premium_grants from anon, authenticated;
grant select on public.premium_grants to authenticated;

create policy "read own premium grant"
  on public.premium_grants for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Grant someone premium (run in the SQL editor):
--   insert into public.premium_grants (user_id, expires_at, note)
--   select id, now() + interval '1 year', 'why' from auth.users where email = '...';
