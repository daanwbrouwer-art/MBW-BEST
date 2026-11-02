-- The live database had parks.submitted_by and park_photos.uploaded_by as
-- ON DELETE NO ACTION (diverging from 20260726120500/120600, which declare
-- SET NULL). NO ACTION makes auth.admin.deleteUser fail for anyone who ever
-- submitted a park, which broke account deletion (delete-account Edge
-- Function) for exactly those users. SET NULL matches the Privacy Policy:
-- approved parks stay as community listings with no link to the person.
alter table public.parks
  drop constraint parks_submitted_by_fkey,
  add constraint parks_submitted_by_fkey
    foreign key (submitted_by) references auth.users (id) on delete set null;

alter table public.park_photos
  drop constraint park_photos_uploaded_by_fkey,
  add constraint park_photos_uploaded_by_fkey
    foreign key (uploaded_by) references auth.users (id) on delete set null;
