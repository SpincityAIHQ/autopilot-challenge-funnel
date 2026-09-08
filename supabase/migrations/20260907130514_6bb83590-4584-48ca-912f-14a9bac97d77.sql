-- Extension installation only. Scheduling is performed by the later secure
-- academy integration migration after its URL and bearer exist in Vault.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
