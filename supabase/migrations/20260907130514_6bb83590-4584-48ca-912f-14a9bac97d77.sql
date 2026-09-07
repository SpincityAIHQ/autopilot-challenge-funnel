-- lovable-cron-fallback-reviewed: 288 runs/day; outbound nurture/reminder handoff to GoHighLevel is a durable outbox that has no database-side event to trigger from (it must retry failed HTTP deliveries and re-check eligibility over time), and a welcome message delayed up to an hour is unacceptable.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'academy-process-integrations',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
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