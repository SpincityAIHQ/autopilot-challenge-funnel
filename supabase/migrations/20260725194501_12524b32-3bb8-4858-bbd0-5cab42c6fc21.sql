-- Expose operator-approved Intensive eligibility via session_active_scopes
-- as a synthetic scope 'intensive_eligibility'. Keeps entitlement-summary
-- and read-side scope checks unchanged for existing product scopes.
CREATE OR REPLACE FUNCTION public.session_active_scopes(_session_hash text)
 RETURNS TABLE(buyer_email text, scopes text[], expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.buyer_email,
         COALESCE(
           (SELECT array_agg(DISTINCT scope)
              FROM (
                SELECT e.product AS scope
                  FROM public.entitlements e
                 WHERE e.buyer_email = s.buyer_email
                   AND e.revoked_at IS NULL
                UNION
                SELECT 'intensive_eligibility'::text AS scope
                  FROM public.intensive_eligibility ie
                 WHERE lower(ie.buyer_email) = lower(s.buyer_email)
              ) x
           ),
           ARRAY[]::text[]
         ) AS scopes,
         s.expires_at
    FROM public.resource_sessions s
   WHERE s.session_hash = _session_hash
     AND s.revoked_at IS NULL
     AND s.expires_at > now();
$function$;

-- Lock down execution: service_role only (matches prior migrations).
REVOKE ALL ON FUNCTION public.session_active_scopes(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.session_active_scopes(text) TO service_role;