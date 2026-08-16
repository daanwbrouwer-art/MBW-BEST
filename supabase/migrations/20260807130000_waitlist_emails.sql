-- Founding Member email waitlist for the Shopify marketing site
-- (my-bodyweight.com), fed by the join-waitlist Edge Function. Applied to
-- the live project (wiowzwkowbilpjgbemsq) via the Supabase MCP tools on
-- 2026-08-07.
CREATE TABLE IF NOT EXISTS public.waitlist_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL CHECK (email = lower(email)),
  signed_up_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'shopify_early_access',
  position integer GENERATED ALWAYS AS IDENTITY
);

CREATE INDEX IF NOT EXISTS waitlist_emails_email_idx ON public.waitlist_emails (email);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_founding_member boolean NOT NULL DEFAULT false;

ALTER TABLE public.waitlist_emails ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (Edge Function) can read/write. Never expose to client.
