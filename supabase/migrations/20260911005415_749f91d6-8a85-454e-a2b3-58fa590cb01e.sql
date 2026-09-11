CREATE OR REPLACE FUNCTION public.academy_claim_outbox(p_limit integer, p_names text[])
 RETURNS SETOF academy_outbox
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('academy-outbox-claim'));
  -- A missing delivery receipt is uncertain: never automatically resend it.
  UPDATE public.academy_outbox SET status='unknown',completed_at=now()
    WHERE status='processing' AND locked_at<now()-interval '10 minutes';
  RETURN QUERY UPDATE public.academy_outbox SET status='processing',locked_at=now(),attempts=attempts+1
  WHERE id IN (
    SELECT o.id FROM public.academy_outbox o
    WHERE o.status IN ('pending','retry') AND o.due_at<=now() AND o.attempts<3
      AND (p_names IS NULL OR o.name = ANY(p_names))
      AND ((o.name NOT LIKE 'learning_%' AND o.name<>'webinar_not_started') OR (
        NOT EXISTS (SELECT 1 FROM public.academy_outbox inflight
          WHERE inflight.user_id=o.user_id AND (inflight.name LIKE 'learning_%' OR inflight.name='webinar_not_started')
            AND inflight.status='processing')
        AND o.id=(SELECT first_job.id FROM public.academy_outbox first_job
          WHERE first_job.user_id=o.user_id AND (first_job.name LIKE 'learning_%' OR first_job.name='webinar_not_started')
            AND first_job.status IN ('pending','retry') AND first_job.due_at<=now()
            AND first_job.attempts<3
            AND (p_names IS NULL OR first_job.name = ANY(p_names))
            ORDER BY first_job.due_at,first_job.id LIMIT 1)
      ))
    ORDER BY o.due_at,o.id FOR UPDATE SKIP LOCKED LIMIT least(greatest(coalesce(p_limit,0),0),20)
  ) RETURNING *;
END $function$;

REVOKE ALL ON FUNCTION public.academy_claim_outbox(integer, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.academy_claim_outbox(integer, text[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_claim_outbox(integer, text[]) TO service_role;