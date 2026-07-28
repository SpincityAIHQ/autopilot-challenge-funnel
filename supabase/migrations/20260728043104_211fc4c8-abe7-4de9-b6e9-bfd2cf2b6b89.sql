
CREATE TABLE public.summit_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  first_name text,
  email text,
  phone text,
  tier_reserved text NOT NULL DEFAULT 'ga',
  settled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT summit_reservations_token_len_chk CHECK (char_length(token) = 32),
  CONSTRAINT summit_reservations_tier_chk CHECK (tier_reserved IN ('ga','ga_vip','ga_vip_vault'))
);

-- Reuse the existing project trigger function public.update_updated_at_column().
CREATE TRIGGER trg_summit_reservations_updated_at
  BEFORE UPDATE ON public.summit_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Least privilege: only the service role touches this table.
REVOKE ALL ON public.summit_reservations FROM PUBLIC;
REVOKE ALL ON public.summit_reservations FROM anon;
REVOKE ALL ON public.summit_reservations FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.summit_reservations TO service_role;

ALTER TABLE public.summit_reservations ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies for anon/authenticated. All access is
-- server-side via the service-role client, which bypasses RLS.
