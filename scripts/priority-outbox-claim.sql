-- Transactional account/access confirmations get the first available delivery slots.
-- No messages are sent by this script. Apply before deploying p_limit=10 caller.
CREATE OR REPLACE FUNCTION public.academy_claim_outbox(p_limit integer)
RETURNS SETOF public.academy_outbox LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('academy-outbox-claim'));
 -- A missing delivery receipt is uncertain: never automatically resend it.
 UPDATE public.academy_outbox SET status='unknown',completed_at=now()
 WHERE status='processing' AND locked_at<now()-interval '10 minutes';
 RETURN QUERY
 WITH one_learning AS (
  SELECT o.id FROM public.academy_outbox o
  WHERE o.name LIKE 'learning_%' AND o.status IN ('pending','retry') AND o.due_at<=now() AND o.attempts<3
   AND NOT EXISTS (SELECT 1 FROM public.academy_outbox inflight
    WHERE inflight.user_id=o.user_id AND inflight.name LIKE 'learning_%' AND inflight.status='processing')
   AND o.id=(SELECT first_job.id FROM public.academy_outbox first_job
    WHERE first_job.user_id=o.user_id AND first_job.name LIKE 'learning_%'
     AND first_job.status IN ('pending','retry') AND first_job.due_at<=now() AND first_job.attempts<3
    ORDER BY first_job.due_at,first_job.id LIMIT 1)
  ORDER BY o.due_at,o.id LIMIT 1
 ), selected AS (
  SELECT o.id FROM public.academy_outbox o
  WHERE o.status IN ('pending','retry') AND o.due_at<=now() AND o.attempts<3
   AND (o.name NOT LIKE 'learning_%' OR o.id=(SELECT id FROM one_learning))
  ORDER BY CASE
   WHEN o.name IN ('webinar_registered','access_activated') THEN 0
   WHEN o.name IN ('webinar_registered_sms','access_activated_sms','purchase_access_sms') THEN 1
   WHEN o.name IN ('customer_returned','customer_preferences_updated','purchase_updated') THEN 2
   WHEN o.name LIKE 'learning_%' THEN 4
   ELSE 3 END, o.due_at,o.id
  FOR UPDATE SKIP LOCKED LIMIT least(greatest(coalesce(p_limit,0),0),10)
 )
 UPDATE public.academy_outbox o SET status='processing',locked_at=now(),attempts=o.attempts+1
 WHERE o.id IN (SELECT id FROM selected) RETURNING o.*;
END $$;
REVOKE ALL ON FUNCTION public.academy_claim_outbox(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_claim_outbox(integer) TO service_role;
