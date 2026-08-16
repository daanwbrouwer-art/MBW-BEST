-- Outdoor training spots only (no indoor gyms/fitness centres) — community
-- submitted, moderator approved before they're publicly visible.
create table public.parks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  equipment text[] not null default '{}',
  submitted_by uuid references auth.users (id) on delete set null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.parks enable row level security;

-- Anyone can see approved parks; a submitter can also see their own
-- not-yet-approved submissions.
create policy "parks_select_approved_or_own"
  on public.parks for select
  using (approved = true or submitted_by = auth.uid());

-- Any authenticated user can submit a park, but only as themselves and only
-- unapproved — approval is a moderation action, not a user action.
create policy "parks_insert_own_unapproved"
  on public.parks for insert
  to authenticated
  with check (submitted_by = auth.uid() and approved = false);
