-- lovable-cron-fallback-reviewed: 288 runs/day; durable outbox handoff to GoHighLevel needs timed retries and eligibility re-checks, and welcome/reminder messages cannot wait up to an hour.
DROP EXTENSION IF EXISTS pg_net;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
REVOKE ALL ON SCHEMA net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('academy-process-integrations');
SELECT cron.schedule(
  'academy-process-integrations',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ai-autopilot-summit.lovable.app/api/academy/process-integrations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'academy_scheduler_bearer')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
