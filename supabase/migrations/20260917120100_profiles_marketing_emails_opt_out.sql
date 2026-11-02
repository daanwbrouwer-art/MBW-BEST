-- Backs the new "Email notifications" toggle in Profile settings — a real,
-- server-side preference (not a no-op) so any future transactional/marketing
-- email sender in this project has something to check before sending.
-- Defaults to opted-in (false = not opted out) since this only covers
-- non-essential email; security-critical mail (password reset, etc.) is
-- never gated by it.
alter table public.profiles
  add column if not exists marketing_emails_opt_out boolean not null default false;
