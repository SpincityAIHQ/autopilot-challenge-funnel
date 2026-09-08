-- One-time schema for the existing academy integration scheduler.
-- Contains no bearer credential. Execute as postgres before deploying the reader.
BEGIN;

CREATE TABLE IF NOT EXISTS public.academy_scheduler_credentials (
  name text PRIMARY KEY CHECK (name = 'academy-process-integrations'),
  token_sha256 text NOT NULL CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
  enabled boolean NOT NULL DEFAULT true,
  rotated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academy_scheduler_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.academy_scheduler_credentials FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.academy_scheduler_credentials TO service_role;

CREATE OR REPLACE FUNCTION public.academy_scheduler_authorized(p_token_sha256 text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.academy_scheduler_credentials
    WHERE name = 'academy-process-integrations'
      AND enabled
      AND token_sha256 = p_token_sha256
  );
$function$;
REVOKE ALL ON FUNCTION public.academy_scheduler_authorized(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_scheduler_authorized(text) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
