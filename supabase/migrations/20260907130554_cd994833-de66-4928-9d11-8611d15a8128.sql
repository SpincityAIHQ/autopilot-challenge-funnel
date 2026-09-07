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
  SELECT extensions.http_post(
    url := 'https://ai-autopilot-summit.lovable.app/api/academy/process-integrations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer c396ffadbb848dd54ef7c1a6a0d234955101c0ca4af6d536'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);