-- Remove the broken/leaked job first. The replacement reads both capabilities
-- from Supabase Vault at execution time, so cron.job and Git contain no secret.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

DO $$
DECLARE
  existing_job bigint;
  lane_name text;
BEGIN
  FOR existing_job IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN (
      'academy-process-integrations',
      'academy-process-commerce',
      'academy-process-access',
      'academy-process-ghl'
    )
  LOOP
    PERFORM cron.unschedule(existing_job);
  END LOOP;

  -- Isolate remote calls into bounded lanes. Each job is present but inert
  -- until both Vault secrets exist, so secret provisioning self-activates it.
  FOREACH lane_name IN ARRAY ARRAY['commerce', 'access', 'ghl']
  LOOP
    PERFORM cron.schedule(
      'academy-process-' || lane_name,
      '*/5 * * * *',
      format($job$
    SELECT net.http_post(
      url := (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'academy_integration_url'
        LIMIT 1
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'academy_scheduler_bearer'
          LIMIT 1
        )
      ),
      body := jsonb_build_object(
        'source', 'supabase-cron',
        'lane', %L
      ),
      timeout_milliseconds := 20000
    )
    WHERE EXISTS (
      SELECT 1 FROM vault.decrypted_secrets WHERE name = 'academy_integration_url'
    ) AND EXISTS (
      SELECT 1 FROM vault.decrypted_secrets WHERE name = 'academy_scheduler_bearer'
    );
    $job$, lane_name)
    );
  END LOOP;
END
$$;
