-- Adds the AI Spin drop-off reminder to the learning nudge queue and keeps
-- Accelerator session replays out of the activity-book signals they cannot have.
-- Additive: replaces one function body only. Existing rows and policies are untouched.
BEGIN;
CREATE OR REPLACE FUNCTION public.academy_queue_learning_nudges()
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE inserted integer; BEGIN
 INSERT INTO public.academy_outbox(dedup_key,user_id,name,payload)
 SELECT DISTINCT ON(p.user_id)
 'learning:'||p.user_id||':'||p.lesson_id||':'||CASE WHEN n.signal='learning_dropoff' THEN p.media_version ELSE p.content_version END||':'||n.signal,
 p.user_id,n.signal,
 jsonb_build_object('lessonId',p.lesson_id,'contentVersion',p.content_version,'mediaVersion',p.media_version)
 FROM public.academy_progress p JOIN public.academy_profiles a ON a.user_id=p.user_id
 CROSS JOIN LATERAL (
  SELECT coalesce(sum(((v->>1)::numeric)-((v->>0)::numeric)),0) AS watched
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.intervals)='array' THEN p.intervals ELSE '[]'::jsonb END) v
 ) w
 CROSS JOIN LATERAL (SELECT CASE
 WHEN p.lesson_id NOT LIKE 'accelerator-day-%' AND p.workbook_status='needs_revision' THEN 'learning_feedback'
 WHEN p.lesson_id NOT LIKE 'accelerator-day-%' AND p.workbook_status='approved' THEN 'learning_approved'
 WHEN p.lesson_id NOT LIKE 'accelerator-day-%' AND p.quiz_total>0 AND p.quiz_score::numeric/p.quiz_total<0.8 AND p.updated_at<now()-interval '2 hours' THEN 'learning_practice'
 WHEN p.duration>0 AND w.watched/p.duration>=0.05 AND w.watched/p.duration<0.9 AND p.updated_at<now()-interval '1 day' THEN 'learning_dropoff'
 WHEN p.lesson_id NOT LIKE 'accelerator-day-%' AND p.workbook_status='draft' AND p.updated_at<now()-interval '3 days' THEN 'learning_stalled'
 END AS signal) n
 WHERE a.marketing_consent AND n.signal IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.academy_outbox x WHERE x.dedup_key='learning:'||p.user_id||':'||p.lesson_id||':'||CASE WHEN n.signal='learning_dropoff' THEN p.media_version ELSE p.content_version END||':'||n.signal)
 AND NOT EXISTS(SELECT 1 FROM public.academy_outbox x WHERE x.user_id=p.user_id AND x.name LIKE 'learning_%' AND x.created_at>now()-interval '24 hours')
 ORDER BY p.user_id,CASE n.signal WHEN 'learning_feedback' THEN 1 WHEN 'learning_practice' THEN 2 WHEN 'learning_dropoff' THEN 3 WHEN 'learning_approved' THEN 4 ELSE 5 END
 LIMIT 100 ON CONFLICT(dedup_key) DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;RETURN inserted;
END $$;
REVOKE ALL ON FUNCTION public.academy_queue_learning_nudges() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_queue_learning_nudges() TO service_role;
COMMIT;
