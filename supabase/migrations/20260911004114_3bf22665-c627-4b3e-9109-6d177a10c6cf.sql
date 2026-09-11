CREATE OR REPLACE FUNCTION public.academy_claim_outbox(p_limit integer, p_names text[])
RETURNS SETOF public.academy_outbox LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 -- An interrupted delivery has an uncertain outcome. Do not blindly resend it.
 UPDATE public.academy_outbox SET status='unknown' WHERE status='processing' AND locked_at<now()-interval '10 minutes';
 RETURN QUERY UPDATE public.academy_outbox SET status='processing',locked_at=now(),attempts=attempts+1
 WHERE id IN (
   SELECT id FROM public.academy_outbox
   WHERE status IN ('pending','retry') AND due_at<=now() AND attempts<3
     AND (p_names IS NULL OR name = ANY(p_names))
   ORDER BY due_at FOR UPDATE SKIP LOCKED LIMIT least(p_limit,20)
 ) RETURNING *;
END $$;

REVOKE ALL ON FUNCTION public.academy_claim_outbox(integer, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_claim_outbox(integer, text[]) TO service_role;