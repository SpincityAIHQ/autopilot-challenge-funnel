
-- 1. Token active calculation: also require token not revoked.
CREATE OR REPLACE FUNCTION public.entitlement_by_token_hash(_token_hash text)
 RETURNS TABLE(buyer_email text, scope text, registration_id uuid, expires_at timestamptz, used_at timestamptz, active boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT t.buyer_email, t.scope, t.registration_id, t.expires_at, t.used_at,
    (t.used_at IS NULL
     AND t.revoked_at IS NULL
     AND t.expires_at > now()
     AND EXISTS (
       SELECT 1 FROM public.entitlements e
       WHERE e.buyer_email = t.buyer_email
         AND e.product = t.scope
         AND e.revoked_at IS NULL
     )) AS active
  FROM public.access_tokens t
  WHERE t.token_hash = _token_hash
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.entitlement_by_token_hash(text) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.entitlement_by_token_hash(text) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.entitlement_by_token_hash(text) FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.entitlement_by_token_hash(text) FROM sandbox_exec';
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.entitlement_by_token_hash(text) TO service_role;

-- 2. Durable shared rate-limit store.
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key_hash text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour'
);

REVOKE ALL ON public.rate_limits FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public.rate_limits FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON public.rate_limits FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'REVOKE ALL ON public.rate_limits FROM sandbox_exec';
  END IF;
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: service_role bypasses; every other role is denied.

CREATE INDEX IF NOT EXISTS rate_limits_expires_idx ON public.rate_limits(expires_at);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _key_hash text, _limit integer, _window_seconds integer
)
 RETURNS TABLE(ok boolean, retry_after integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _now timestamptz := now();
  _row public.rate_limits%ROWTYPE;
  _window_end timestamptz;
BEGIN
  IF _key_hash IS NULL OR length(_key_hash) < 16 THEN
    RAISE EXCEPTION 'invalid rate-limit key' USING ERRCODE = '22023';
  END IF;
  IF _limit IS NULL OR _limit < 1 OR _limit > 10000 THEN
    RAISE EXCEPTION 'invalid limit' USING ERRCODE = '22023';
  END IF;
  IF _window_seconds IS NULL OR _window_seconds < 1 OR _window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid window' USING ERRCODE = '22023';
  END IF;

  -- Opportunistic bounded cleanup of expired buckets.
  DELETE FROM public.rate_limits
    WHERE ctid IN (
      SELECT ctid FROM public.rate_limits
        WHERE expires_at < _now
        LIMIT 100
    );

  INSERT INTO public.rate_limits(key_hash, window_start, count, expires_at)
    VALUES (_key_hash, _now, 1, _now + make_interval(secs => _window_seconds))
  ON CONFLICT (key_hash) DO UPDATE
    SET count = CASE
          WHEN public.rate_limits.window_start + make_interval(secs => _window_seconds) <= _now
            THEN 1
          ELSE public.rate_limits.count + 1
        END,
        window_start = CASE
          WHEN public.rate_limits.window_start + make_interval(secs => _window_seconds) <= _now
            THEN _now
          ELSE public.rate_limits.window_start
        END,
        expires_at = CASE
          WHEN public.rate_limits.window_start + make_interval(secs => _window_seconds) <= _now
            THEN _now + make_interval(secs => _window_seconds)
          ELSE public.rate_limits.expires_at
        END
    RETURNING * INTO _row;

  _window_end := _row.window_start + make_interval(secs => _window_seconds);

  IF _row.count > _limit THEN
    ok := false;
    retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (_window_end - _now)))::int);
  ELSE
    ok := true;
    retry_after := 0;
  END IF;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM sandbox_exec';
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;

-- 3. Resource-session revocation (used by logout endpoint).
CREATE OR REPLACE FUNCTION public.revoke_resource_session(_session_hash text)
 RETURNS boolean
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF _session_hash IS NULL OR length(_session_hash) < 32 THEN
    RETURN false;
  END IF;
  UPDATE public.resource_sessions
    SET revoked_at = now()
    WHERE session_hash = _session_hash
      AND revoked_at IS NULL;
  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revoke_resource_session(text) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.revoke_resource_session(text) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.revoke_resource_session(text) FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.revoke_resource_session(text) FROM sandbox_exec';
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.revoke_resource_session(text) TO service_role;
