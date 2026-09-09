-- Apply this reviewed deployment SQL once; it contains no customer data.
-- The existing no-argument RPC remains compatible with the deployed worker.
BEGIN;

-- Verified student activity includes reading and tutor conversations, not just
-- video telemetry. The server calls this only for the authenticated learner.
CREATE TABLE IF NOT EXISTS public.academy_learning_activity (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_active_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academy_learning_activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.academy_learning_activity FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.academy_learning_activity TO service_role;
CREATE OR REPLACE FUNCTION public.academy_touch_learning_activity(p_user uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  INSERT INTO public.academy_learning_activity(user_id,last_active_at) VALUES(p_user,now())
  ON CONFLICT(user_id) DO UPDATE SET last_active_at=excluded.last_active_at
    WHERE academy_learning_activity.last_active_at<=now()-interval '5 minutes';
$$;
REVOKE ALL ON FUNCTION public.academy_touch_learning_activity(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_touch_learning_activity(uuid) TO service_role;

-- Operator-reviewed recording anchors only. Empty configuration uses generic copy.
CREATE TABLE IF NOT EXISTS public.academy_learning_milestones (
  id text PRIMARY KEY,
  lesson_id text NOT NULL,
  media_version text NOT NULL CHECK(media_version<>''),
  kind text NOT NULL CHECK(kind IN ('break','lunch')),
  window_start_seconds double precision NOT NULL CHECK(window_start_seconds>=0),
  window_end_seconds double precision NOT NULL CHECK(window_end_seconds>window_start_seconds AND window_end_seconds<=43200),
  label text NOT NULL,
  source_reference text NOT NULL,
  active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.academy_learning_milestones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.academy_learning_milestones FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.academy_learning_milestones TO service_role;

CREATE OR REPLACE FUNCTION public.academy_queue_learning_nudges()
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE inserted integer;
BEGIN
  -- Serialize queue creation so simultaneous workers cannot exceed the daily cap.
  PERFORM pg_advisory_xact_lock(hashtext('academy-learning-nudge-queue'));
  WITH evidence AS (
    SELECT p.*, a.marketing_consent,
      p.lesson_id IN ('free-webinar','business-before-ai','hire-the-ai-team',
        'coordinate-the-business','measure-the-system','own-the-platform','implementation-lab') AS is_lesson,
      coalesce(w.coverage,0) AS watched_percent,
      coalesce(w.watched_seconds,0) AS watched_seconds, coalesce(w.furthest,0) AS watched_furthest,
      greatest((SELECT max(activity.updated_at) FROM public.academy_progress activity
        WHERE activity.user_id=p.user_id),
        (SELECT presence.last_active_at FROM public.academy_learning_activity presence
          WHERE presence.user_id=p.user_id)) AS last_learning_activity_at,
      coalesce(r.id::text,md5(p.workbook::text||coalesce(p.reviewer_feedback,''))) AS review_key,
      coalesce(q.id::text,md5(coalesce(p.quiz_score::text,'')||':'||coalesce(p.quiz_total::text,''))) AS quiz_key
    FROM public.academy_progress p
    JOIN public.academy_profiles a ON a.user_id=p.user_id AND a.marketing_consent
    LEFT JOIN LATERAL (
      -- range_agg merges overlap before measuring: seeking and replaying a span
      -- cannot increase coverage. Empty/missing duration never qualifies.
      SELECT sum(upper(span)-lower(span))*100/nullif(p.duration,0)::numeric AS coverage,
        sum(upper(span)-lower(span)) AS watched_seconds,max(upper(span)) AS furthest
      FROM unnest((SELECT range_agg(numrange(
        greatest(0,(i->>0)::numeric),least(p.duration::numeric,(i->>1)::numeric),'[)'))
        FROM jsonb_array_elements(p.intervals) i
        WHERE p.duration>0 AND (i->>1)::numeric>(i->>0)::numeric
          AND least(p.duration::numeric,(i->>1)::numeric)>greatest(0,(i->>0)::numeric))) span
    ) w ON true
    LEFT JOIN LATERAL (
      SELECT id FROM public.academy_reviews
      WHERE user_id=p.user_id AND lesson_id=p.lesson_id AND status=p.workbook_status
      ORDER BY created_at DESC,id DESC LIMIT 1
    ) r ON true
    LEFT JOIN LATERAL (
      SELECT id FROM public.academy_attempts
      WHERE user_id=p.user_id AND lesson_id=p.lesson_id AND content_version=p.content_version
      ORDER BY created_at DESC,id DESC LIMIT 1
    ) q ON true
    WHERE p.lesson_id IN ('free-webinar','business-before-ai','hire-the-ai-team',
      'coordinate-the-business','measure-the-system','own-the-platform','implementation-lab')
      OR p.lesson_id ~ '^accelerator-day-(0[1-9]|1[0-2])$'
  ), signals AS (
    SELECT e.*, n.signal,
      CASE n.signal
        WHEN 'learning_feedback' THEN e.review_key
        WHEN 'learning_approved' THEN e.review_key
        WHEN 'learning_practice' THEN e.quiz_key
        WHEN 'learning_stalled' THEN md5(e.workbook::text)
        ELSE e.last_learning_activity_at::text END AS evidence_key
    FROM evidence e
    CROSS JOIN LATERAL (SELECT CASE
      WHEN e.is_lesson AND e.workbook_status='needs_revision' THEN 'learning_feedback'
      WHEN e.is_lesson AND e.quiz_total>0 AND e.quiz_score::numeric/e.quiz_total<0.8
        AND e.updated_at<=now()-interval '2 hours' THEN 'learning_practice'
      WHEN e.is_lesson AND e.workbook_status='approved' THEN 'learning_approved'
      WHEN e.media_version<>'' AND e.watched_seconds>=60 AND e.watched_percent<90
        AND e.last_learning_activity_at<=now()-interval '48 hours' THEN 'learning_dropoff'
      WHEN e.is_lesson AND e.content_version<>'' AND e.workbook_status='draft'
        AND e.updated_at<=now()-interval '3 days' THEN 'learning_stalled'
    END AS signal) n
    WHERE n.signal IS NOT NULL
  ), candidates AS (
    SELECT s.*, 'learning:v2:'||s.user_id||':'||s.lesson_id||':'||
      CASE WHEN s.signal='learning_dropoff' THEN s.media_version ELSE s.content_version END||
      ':'||s.signal||':'||s.evidence_key AS event_key,
      milestone.id AS milestone_id,milestone.label AS milestone_label
    FROM signals s
    LEFT JOIN LATERAL (SELECT m.id,m.label FROM public.academy_learning_milestones m
      WHERE s.signal='learning_dropoff' AND m.active AND m.lesson_id=s.lesson_id
        AND m.media_version=s.media_version AND s.watched_furthest BETWEEN m.window_start_seconds AND m.window_end_seconds
      ORDER BY m.window_start_seconds DESC,m.id LIMIT 1) milestone ON true
  )
  INSERT INTO public.academy_outbox(dedup_key,user_id,name,payload)
  SELECT DISTINCT ON(c.user_id) c.event_key,c.user_id,c.signal,
    jsonb_build_object('lessonId',c.lesson_id,'contentVersion',c.content_version,
      'engine','SPINXP','policyVersion','spinxp-2026-09-09.1',
      'mediaVersion',c.media_version,'progressUpdatedAt',c.updated_at,'evidenceKey',c.evidence_key,
      'lastLearningActivityAt',c.last_learning_activity_at,'lastLearningAt',c.last_learning_activity_at,
      'milestoneId',c.milestone_id,'milestoneLabel',c.milestone_label,
      'interventionReason',CASE WHEN c.signal='learning_dropoff' THEN
        CASE WHEN c.milestone_id IS NOT NULL THEN 'break_not_returned_48h'
          WHEN c.watched_furthest<=3600 THEN 'early_exit_48h' ELSE 'incomplete_replay_48h' END
        ELSE c.signal END)
  FROM candidates c
  WHERE NOT EXISTS (SELECT 1 FROM public.academy_outbox x WHERE x.dedup_key=c.event_key)
    AND NOT EXISTS (SELECT 1 FROM public.academy_outbox x WHERE x.user_id=c.user_id
      AND x.name LIKE 'learning_%' AND x.status<>'cancelled'
      AND greatest(x.created_at,coalesce(x.completed_at,x.created_at))>now()-interval '24 hours')
  ORDER BY c.user_id,CASE c.signal WHEN 'learning_feedback' THEN 1 WHEN 'learning_practice' THEN 2
    WHEN 'learning_approved' THEN 3 WHEN 'learning_dropoff' THEN 4 ELSE 5 END,
    c.updated_at DESC,c.lesson_id
  LIMIT 100 ON CONFLICT(dedup_key) DO NOTHING;
  GET DIAGNOSTICS inserted=ROW_COUNT;
  RETURN inserted;
END $$;
REVOKE ALL ON FUNCTION public.academy_queue_learning_nudges() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_queue_learning_nudges() TO service_role;

-- A student can have at most one learning delivery in flight, including when
-- two worker invocations overlap. Other students and non-learning jobs proceed.
CREATE OR REPLACE FUNCTION public.academy_claim_outbox(p_limit integer)
RETURNS SETOF public.academy_outbox
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('academy-outbox-claim'));
  -- A missing delivery receipt is uncertain: never automatically resend it.
  UPDATE public.academy_outbox SET status='unknown',completed_at=now()
    WHERE status='processing' AND locked_at<now()-interval '10 minutes';
  RETURN QUERY UPDATE public.academy_outbox SET status='processing',locked_at=now(),attempts=attempts+1
  WHERE id IN (
    SELECT o.id FROM public.academy_outbox o
    WHERE o.status IN ('pending','retry') AND o.due_at<=now() AND o.attempts<3
      AND (o.name NOT LIKE 'learning_%' OR (
        NOT EXISTS (SELECT 1 FROM public.academy_outbox inflight
          WHERE inflight.user_id=o.user_id AND inflight.name LIKE 'learning_%'
            AND inflight.status='processing')
        AND o.id=(SELECT first_job.id FROM public.academy_outbox first_job
          WHERE first_job.user_id=o.user_id AND first_job.name LIKE 'learning_%'
            AND first_job.status IN ('pending','retry') AND first_job.due_at<=now()
            AND first_job.attempts<3 ORDER BY first_job.due_at,first_job.id LIMIT 1)
      ))
    ORDER BY o.due_at,o.id FOR UPDATE SKIP LOCKED LIMIT least(greatest(coalesce(p_limit,0),0),20)
  ) RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.academy_claim_outbox(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_claim_outbox(integer) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
