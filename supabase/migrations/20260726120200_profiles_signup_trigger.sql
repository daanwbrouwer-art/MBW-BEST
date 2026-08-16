-- Auto-create a profiles row whenever a new auth.users account is created,
-- so the client never has to race a manual insert right after sign-up.
-- security definer: runs as the function owner (bypasses the caller's RLS,
-- which at this point has no profiles row yet to satisfy "auth.uid() = id").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
