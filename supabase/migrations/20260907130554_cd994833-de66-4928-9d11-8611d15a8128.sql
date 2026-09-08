-- Intentionally no cron definition here. An earlier revision embedded a
-- capability bearer in migration text and addressed pg_net through the wrong
-- schema. The later secure migration owns the scheduled job.
REVOKE ALL ON SCHEMA net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC, anon, authenticated;
