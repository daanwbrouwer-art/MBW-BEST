-- Storage bucket backing park_photos.photo_url. Public bucket: photos are
-- meant to be visible to everyone once their park is approved (the
-- park_photos row itself is still gated by the "of an approved park" RLS
-- policy from 20260726120600_park_photos.sql — this only controls the raw
-- object storage, not the DB row visibility).
insert into storage.buckets (id, name, public)
values ('park-photos', 'park-photos', true)
on conflict (id) do nothing;

create policy "park_photos_bucket_public_read"
  on storage.objects for select
  using (bucket_id = 'park-photos');

create policy "park_photos_bucket_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'park-photos');
