-- Applied directly to the live project via the Supabase MCP tools; mirrored
-- here for documentation (see note in the previous migration file).

-- Lightweight report log — Apple App Store Guideline 1.2 requires a report
-- affordance for any app with user discovery/messaging. No moderation
-- dashboard yet; this just durably records reports for later review.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint reports_not_self check (reporter_id <> reported_id)
);

alter table public.reports enable row level security;

create policy "reports_select_own"
  on public.reports for select
  using (auth.uid() = reporter_id);

create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);
