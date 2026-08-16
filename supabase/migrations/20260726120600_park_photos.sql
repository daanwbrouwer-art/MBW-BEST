-- Community-submitted photos for a park. Many photos per park, from many
-- different uploaders over time.
create table public.park_photos (
  id uuid primary key default gen_random_uuid(),
  park_id uuid not null references public.parks (id) on delete cascade,
  photo_url text not null,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index park_photos_park_id_idx on public.park_photos (park_id);

alter table public.park_photos enable row level security;

create policy "park_photos_select_of_approved_park"
  on public.park_photos for select
  using (
    exists (
      select 1 from public.parks
      where parks.id = park_photos.park_id
        and parks.approved = true
    )
  );

create policy "park_photos_insert_own_to_approved_park"
  on public.park_photos for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.parks
      where parks.id = park_photos.park_id
        and parks.approved = true
    )
  );
