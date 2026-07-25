
CREATE OR REPLACE FUNCTION public.exchange_access_token(_token_hash text, _session_hash text, _ttl_seconds integer)
 RETURNS TABLE(buyer_email text, scopes text[], expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  UPDATE public.access_tokens t
     SET used_at = now()
   WHERE t.token_hash = _token_hash
     AND t.used_at IS NULL
     AND t.revoked_at IS NULL
     AND t.expires_at > now()
  RETURNING t.buyer_email, t.scope
      INTO _email, _scope;

  IF _email IS NULL THEN
    RAISE EXCEPTION 'token not exchangeable' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.entitlements e
    WHERE e.buyer_email = _email
      AND e.product = _scope
      AND e.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'entitlement not active' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT e.product), ARRAY[]::text[])
    INTO _scopes
    FROM public.entitlements e
   WHERE e.buyer_email = _email
     AND e.revoked_at IS NULL;

  _exp := now() + make_interval(secs => _ttl_seconds);

  INSERT INTO public.resource_sessions
    (session_hash, buyer_email, source_token_hash, expires_at, issued_scopes)
    VALUES (_session_hash, _email, _token_hash, _exp, _scopes);

  exchange_access_token.buyer_email := _email;
  exchange_access_token.scopes      := _scopes;
  exchange_access_token.expires_at  := _exp;
  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.exchange_access_token(text,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exchange_access_token(text,text,integer) FROM anon;
REVOKE ALL ON FUNCTION public.exchange_access_token(text,text,integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exchange_access_token(text,text,integer) TO service_role;
