-- ============================================================
-- Final correctness pass: single-use token → session cookie model.
-- Adds resource_sessions + service-role-only RPCs. Does NOT modify
-- ACLs already tightened in prior migrations.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.resource_sessions (
  session_hash text PRIMARY KEY,
  buyer_email  text NOT NULL,
  source_token_hash text NOT NULL,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz
);

CREATE INDEX IF NOT EXISTS resource_sessions_buyer_idx
  ON public.resource_sessions (buyer_email);

REVOKE ALL ON TABLE public.resource_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_sessions TO service_role;
ALTER TABLE public.resource_sessions ENABLE ROW LEVEL SECURITY;
-- No policies: service_role bypasses RLS; no other role gets access.

-- ------------------------------------------------------------
-- Atomic single-use exchange: token hash → session hash + scopes.
-- Marks token used_at exactly once (fails on reuse). Returns the
-- FULL set of active entitlement scopes for the buyer (not just
-- the token's original scope) so one session opens everything
-- the buyer actually owns.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exchange_access_token(
  _token_hash   text,
  _session_hash text,
  _ttl_seconds  integer
) RETURNS TABLE(buyer_email text, scopes text[], expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email   text;
  _scope   text;
  _exp     timestamptz;
  _scopes  text[];
BEGIN
  IF _token_hash IS NULL OR length(_token_hash) < 32 THEN
    RAISE EXCEPTION 'invalid token hash' USING ERRCODE = '22023';
  END IF;
  IF _session_hash IS NULL OR length(_session_hash) < 32 THEN
    RAISE EXCEPTION 'invalid session hash' USING ERRCODE = '22023';
  END IF;
  IF _ttl_seconds IS NULL OR _ttl_seconds < 60 OR _ttl_seconds > 60*60*24*7 THEN
    RAISE EXCEPTION 'invalid ttl' USING ERRCODE = '22023';
  END IF;

  -- Atomic single-use: only succeeds if used_at IS NULL and unexpired.
  UPDATE public.access_tokens
     SET used_at = now()
   WHERE token_hash = _token_hash
     AND used_at IS NULL
     AND expires_at > now()
  RETURNING access_tokens.buyer_email, access_tokens.scope
      INTO _email, _scope;

  IF _email IS NULL THEN
    RAISE EXCEPTION 'token not exchangeable' USING ERRCODE = 'P0002';
  END IF;

  -- Entitlement for the token's own scope must be active right now.
  IF NOT EXISTS (
    SELECT 1 FROM public.entitlements e
    WHERE e.buyer_email = _email
      AND e.product = _scope
      AND e.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'entitlement not active' USING ERRCODE = 'P0002';
  END IF;

  -- Collect ALL active entitlement scopes for this buyer.
  SELECT COALESCE(array_agg(DISTINCT e.product), ARRAY[]::text[])
    INTO _scopes
    FROM public.entitlements e
   WHERE e.buyer_email = _email
     AND e.revoked_at IS NULL;

  _exp := now() + make_interval(secs => _ttl_seconds);

  INSERT INTO public.resource_sessions
    (session_hash, buyer_email, source_token_hash, expires_at)
    VALUES (_session_hash, _email, _token_hash, _exp);

  buyer_email := _email;
  scopes      := _scopes;
  expires_at  := _exp;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.exchange_access_token(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exchange_access_token(text, text, integer) TO service_role;

-- ------------------------------------------------------------
-- Session read: given the session hash, return CURRENT active
-- entitlement scopes for the buyer, or NULL row if session is
-- missing/expired/revoked. Enforces revocation on every read.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.session_active_scopes(_session_hash text)
RETURNS TABLE(buyer_email text, scopes text[], expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.buyer_email,
         COALESCE(array_agg(DISTINCT e.product) FILTER (WHERE e.product IS NOT NULL),
                  ARRAY[]::text[]) AS scopes,
         s.expires_at
    FROM public.resource_sessions s
    LEFT JOIN public.entitlements e
      ON e.buyer_email = s.buyer_email
     AND e.revoked_at IS NULL
   WHERE s.session_hash = _session_hash
     AND s.revoked_at IS NULL
     AND s.expires_at > now()
   GROUP BY s.buyer_email, s.expires_at;
$$;

REVOKE ALL ON FUNCTION public.session_active_scopes(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.session_active_scopes(text) TO service_role;
