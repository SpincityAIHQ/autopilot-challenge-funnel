-- Run only after the database-backed authorization code is serving production.
-- This is also the repeatable rotation operation. Never print the generated token.
-- The existing schedule, active flag, target URL, payload and timeout are preserved.
BEGIN;
DO $rotation$
DECLARE
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_secret_id uuid;
  v_job_id bigint;
BEGIN
  SELECT jobid INTO STRICT v_job_id
  FROM cron.job
  WHERE jobname = 'academy-process-integrations';

  SELECT id INTO v_secret_id
  FROM vault.secrets
  WHERE name = 'academy_scheduler_bearer';
  IF v_secret_id IS NULL THEN
    PERFORM vault.create_secret(
      v_token,
      'academy_scheduler_bearer',
      'Bearer for the academy integration scheduler; never export or commit'
    );
  ELSE
    PERFORM vault.update_secret(v_secret_id, v_token);
  END IF;

  INSERT INTO public.academy_scheduler_credentials (name, token_sha256, enabled, rotated_at)
  VALUES ('academy-process-integrations', encode(extensions.digest(v_token, 'sha256'), 'hex'), true, now())
  ON CONFLICT (name) DO UPDATE
    SET token_sha256 = EXCLUDED.token_sha256,
        enabled = EXCLUDED.enabled,
        rotated_at = EXCLUDED.rotated_at;

  PERFORM cron.alter_job(
    job_id := v_job_id,
    command := $command$
      SELECT net.http_post(
        url := 'https://ai-autopilot-summit.lovable.app/api/academy/process-integrations',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret FROM vault.decrypted_secrets
            WHERE name = 'academy_scheduler_bearer'
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 20000
      );
    $command$
  );
END;
$rotation$;
COMMIT;
