-- Prepared schema for the EXISTING Summit Supabase project. Not applied remotely.
-- Generate the deployment migration with `supabase migration new summit_learning_platform`
-- after connecting to the correct project; copy this reviewed SQL into that generated file.
BEGIN;
CREATE TABLE public.academy_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 email text NOT NULL, timezone text NOT NULL DEFAULT 'UTC', marketing_consent boolean NOT NULL DEFAULT false,
 consent_version text NOT NULL, consent_at timestamptz NOT NULL DEFAULT now(), attribution jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.academy_progress (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, lesson_id text NOT NULL,
 media_version text NOT NULL DEFAULT '', content_version text NOT NULL DEFAULT '', intervals jsonb NOT NULL DEFAULT '[]',
 duration double precision NOT NULL DEFAULT 0 CHECK(duration BETWEEN 0 AND 43200), position double precision NOT NULL DEFAULT 0,
 quiz_score integer, quiz_total integer, workbook jsonb NOT NULL DEFAULT '{}',
 workbook_status text NOT NULL DEFAULT 'draft' CHECK(workbook_status IN ('draft','submitted','needs_revision','approved')),
 reviewer_feedback text, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,lesson_id),
 CHECK(quiz_score IS NULL OR (quiz_score >= 0 AND quiz_score <= quiz_total))
);
CREATE TABLE public.academy_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL,lesson_id text,payload jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX academy_started_once ON public.academy_events(user_id,name) WHERE name='learning_started';
CREATE INDEX academy_events_user ON public.academy_events(user_id,created_at);
CREATE TABLE public.academy_attempts (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 lesson_id text NOT NULL, content_version text NOT NULL, answers jsonb NOT NULL,score integer NOT NULL,total integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.academy_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 reviewer_id uuid NOT NULL REFERENCES auth.users(id),lesson_id text NOT NULL,status text NOT NULL,feedback text NOT NULL,
 workbook_snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.academy_tutor_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 lesson_id text NOT NULL, question text NOT NULL, answer text NOT NULL,model text NOT NULL,consent_version text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.academy_write_usage(user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,bucket text NOT NULL,hour timestamptz NOT NULL,requests integer NOT NULL DEFAULT 0,PRIMARY KEY(user_id,bucket,hour));
CREATE TABLE public.academy_tutor_usage(day date PRIMARY KEY, requests integer NOT NULL DEFAULT 0);
CREATE TABLE public.academy_orders (
 order_id text PRIMARY KEY,email text NOT NULL,shopify_updated_at timestamptz NOT NULL,financial_status text NOT NULL,
 needs_review boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.academy_grants (
 order_id text NOT NULL REFERENCES public.academy_orders(order_id),line_id text NOT NULL,email text NOT NULL,
 variant_id text NOT NULL,tier text NOT NULL CHECK(tier IN ('ga','vip','vault','accelerator')),quantity integer NOT NULL,
 active boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(order_id,line_id)
);
CREATE INDEX academy_grants_email ON public.academy_grants(email,active);
CREATE TABLE public.academy_commerce_receipts (
 event_id text PRIMARY KEY,order_id text NOT NULL,topic text NOT NULL,status text NOT NULL DEFAULT 'pending',
 received_at timestamptz NOT NULL DEFAULT now(),processed_at timestamptz
);
CREATE TABLE public.academy_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),dedup_key text UNIQUE NOT NULL,user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL,payload jsonb NOT NULL DEFAULT '{}',due_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','delivered','cancelled','unknown','retry')),
 attempts integer NOT NULL DEFAULT 0,locked_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz
);
CREATE INDEX academy_outbox_due ON public.academy_outbox(status,due_at);

-- Client roles can read their own learning evidence. All writes and commerce tables are server-only.
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['academy_profiles','academy_progress','academy_events','academy_attempts','academy_reviews','academy_tutor_messages','academy_tutor_usage','academy_write_usage','academy_orders','academy_grants','academy_commerce_receipts','academy_outbox'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n);
 EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',n);
 EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role',n);
 END LOOP;
 FOREACH n IN ARRAY ARRAY['academy_profiles','academy_progress','academy_events','academy_attempts','academy_reviews','academy_tutor_messages'] LOOP
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',n);
 EXECUTE format('CREATE POLICY own_learning ON public.%I FOR SELECT TO authenticated USING ((select auth.uid()) = user_id)',n);
 END LOOP;
END $$;

CREATE FUNCTION public.academy_register(p_user uuid,p_email text,p_timezone text,p_consent boolean,p_attribution jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE was_new boolean; BEGIN
 INSERT INTO public.academy_profiles(user_id,email,timezone,marketing_consent,consent_version,attribution)
 VALUES(p_user,p_email,p_timezone,p_consent,'academy-marketing-2026-09-06',p_attribution) ON CONFLICT DO NOTHING;
 was_new:=FOUND;
 UPDATE public.academy_profiles SET email=p_email,timezone=p_timezone,marketing_consent=p_consent,
 consent_at=now(),updated_at=now(),attribution=CASE WHEN p_consent THEN CASE WHEN attribution='{}' THEN p_attribution ELSE attribution END ELSE '{}' END WHERE user_id=p_user;
 IF was_new THEN
 INSERT INTO public.academy_events(user_id,name) VALUES(p_user,'webinar_registered');
 INSERT INTO public.academy_outbox(dedup_key,user_id,name,due_at) VALUES
 ('webinar-registration:'||p_user,p_user,'webinar_registered',now()),
 ('webinar-start-reminder:'||p_user,p_user,'webinar_not_started',now()+interval '1 day');
 END IF;
 IF NOT p_consent THEN UPDATE public.academy_outbox SET status='cancelled',completed_at=now() WHERE user_id=p_user AND status IN ('pending','retry'); END IF;
END $$;

CREATE FUNCTION public.academy_record_progress(p_user uuid,p_lesson text,p_kind text,p_payload jsonb,p_event uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.academy_progress; part jsonb; all_ranges jsonb; merged jsonb:='[]'; lo double precision;hi double precision;a double precision;b double precision;dur double precision;
BEGIN
 IF p_kind NOT IN ('playback','quiz','workbook') THEN RAISE EXCEPTION 'Invalid kind'; END IF;
 INSERT INTO public.academy_progress(user_id,lesson_id) VALUES(p_user,p_lesson) ON CONFLICT DO NOTHING;
 SELECT * INTO r FROM public.academy_progress WHERE user_id=p_user AND lesson_id=p_lesson FOR UPDATE;
 INSERT INTO public.academy_events(id,user_id,name,lesson_id) VALUES(p_event,p_user,CASE p_kind WHEN 'quiz' THEN 'quiz_submitted' WHEN 'workbook' THEN CASE WHEN p_payload->>'status'='submitted' THEN 'workbook_submitted' ELSE 'workbook_saved' END ELSE 'media_progress' END,p_lesson) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN; END IF;
 INSERT INTO public.academy_events(user_id,name) VALUES(p_user,'learning_started') ON CONFLICT DO NOTHING;
 IF p_kind='playback' THEN
  dur:=(p_payload->>'duration')::double precision;
  all_ranges:=CASE WHEN r.media_version=p_payload->>'mediaVersion' THEN r.intervals ELSE '[]'::jsonb END || (p_payload->'intervals');
  FOR part IN SELECT value FROM jsonb_array_elements(all_ranges) ORDER BY (value->>0)::double precision LOOP
   a:=greatest(0,(part->>0)::double precision);b:=least(dur,(part->>1)::double precision);
   IF b<=a THEN CONTINUE; END IF;
   IF lo IS NULL THEN lo:=a;hi:=b; ELSIF a<=hi THEN hi:=greatest(hi,b); ELSE merged:=merged||jsonb_build_array(jsonb_build_array(lo,hi));lo:=a;hi:=b; END IF;
  END LOOP;
  IF lo IS NOT NULL THEN merged:=merged||jsonb_build_array(jsonb_build_array(lo,hi)); END IF;
  UPDATE public.academy_progress SET intervals=merged,duration=dur,position=least(dur,(p_payload->>'position')::double precision),media_version=p_payload->>'mediaVersion',updated_at=now() WHERE user_id=p_user AND lesson_id=p_lesson;
  UPDATE public.academy_outbox SET status='cancelled',completed_at=now() WHERE user_id=p_user AND name='webinar_not_started' AND status IN ('pending','retry');
 ELSIF p_kind='quiz' THEN
  INSERT INTO public.academy_attempts(id,user_id,lesson_id,content_version,answers,score,total) VALUES(p_event,p_user,p_lesson,p_payload->>'contentVersion',p_payload->'answers',(p_payload->>'score')::integer,(p_payload->>'total')::integer);
  UPDATE public.academy_progress SET quiz_score=(p_payload->>'score')::integer,quiz_total=(p_payload->>'total')::integer,content_version=p_payload->>'contentVersion',updated_at=now() WHERE user_id=p_user AND lesson_id=p_lesson;
 ELSE
  UPDATE public.academy_progress SET workbook=p_payload->'workbook',workbook_status=p_payload->>'status',reviewer_feedback=NULL,content_version=p_payload->>'contentVersion',updated_at=now() WHERE user_id=p_user AND lesson_id=p_lesson;
 END IF;
END $$;

CREATE FUNCTION public.academy_review_workbook(p_user uuid,p_lesson text,p_reviewer uuid,p_status text,p_feedback text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.academy_progress; BEGIN
 SELECT * INTO r FROM public.academy_progress WHERE user_id=p_user AND lesson_id=p_lesson FOR UPDATE;
 IF r.workbook_status IS DISTINCT FROM 'submitted' OR p_status NOT IN ('approved','needs_revision') THEN RAISE EXCEPTION 'Submission changed; reload'; END IF;
 INSERT INTO public.academy_reviews(user_id,reviewer_id,lesson_id,status,feedback,workbook_snapshot) VALUES(p_user,p_reviewer,p_lesson,p_status,p_feedback,r.workbook);
 UPDATE public.academy_progress SET workbook_status=p_status,reviewer_feedback=p_feedback,updated_at=now() WHERE user_id=p_user AND lesson_id=p_lesson;
END $$;

CREATE FUNCTION public.academy_write_budget(p_user uuid,p_bucket text,p_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE used integer; slot timestamptz:=date_trunc('hour',now()); BEGIN
 INSERT INTO public.academy_write_usage(user_id,bucket,hour) VALUES(p_user,p_bucket,slot) ON CONFLICT DO NOTHING;
 SELECT requests INTO used FROM public.academy_write_usage WHERE user_id=p_user AND bucket=p_bucket AND hour=slot FOR UPDATE;
 IF used>=least(greatest(p_limit,1),240) THEN RETURN false; END IF;
 UPDATE public.academy_write_usage SET requests=requests+1 WHERE user_id=p_user AND bucket=p_bucket AND hour=slot;RETURN true;
END $$;

CREATE FUNCTION public.academy_tutor_budget(p_user uuid,p_global_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE used integer; BEGIN
 IF p_user IS NULL THEN RETURN false; END IF;
 INSERT INTO public.academy_tutor_usage(day) VALUES(CURRENT_DATE) ON CONFLICT DO NOTHING;
 SELECT requests INTO used FROM public.academy_tutor_usage WHERE day=CURRENT_DATE FOR UPDATE;
 IF used >= least(greatest(p_global_limit,1),1000) THEN RETURN false; END IF;
 UPDATE public.academy_tutor_usage SET requests=requests+1 WHERE day=CURRENT_DATE;RETURN true;
END $$;

CREATE FUNCTION public.academy_reconcile_order(p_order text,p_email text,p_updated timestamptz,p_status text,p_review boolean,p_lines jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE current_stamp timestamptz; line jsonb; BEGIN
 INSERT INTO public.academy_orders(order_id,email,shopify_updated_at,financial_status) VALUES(p_order,p_email,'epoch',p_status) ON CONFLICT DO NOTHING;
 SELECT shopify_updated_at INTO current_stamp FROM public.academy_orders WHERE order_id=p_order FOR UPDATE;
 IF current_stamp>p_updated THEN RETURN false; END IF;
 UPDATE public.academy_orders SET email=p_email,shopify_updated_at=p_updated,financial_status=p_status,needs_review=p_review,updated_at=now() WHERE order_id=p_order;
 UPDATE public.academy_grants SET active=false,updated_at=now() WHERE order_id=p_order;
 FOR line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  INSERT INTO public.academy_grants(order_id,line_id,email,variant_id,tier,quantity,active)
  VALUES(p_order,line->>'id',p_email,line->>'variantId',line->>'tier',(line->>'quantity')::integer,(line->>'active')::boolean)
  ON CONFLICT(order_id,line_id) DO UPDATE SET email=excluded.email,variant_id=excluded.variant_id,tier=excluded.tier,quantity=excluded.quantity,active=excluded.active,updated_at=now();
 END LOOP;
 INSERT INTO public.academy_events(user_id,name,payload) SELECT user_id,'purchase_verified',jsonb_build_object('orderId',p_order) FROM public.academy_profiles WHERE email=p_email AND current_stamp<p_updated;
 RETURN true;
END $$;

CREATE FUNCTION public.academy_claim_outbox(p_limit integer)
RETURNS SETOF public.academy_outbox LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 -- An interrupted delivery has an uncertain outcome. Do not blindly resend it.
 UPDATE public.academy_outbox SET status='unknown' WHERE status='processing' AND locked_at<now()-interval '10 minutes';
 RETURN QUERY UPDATE public.academy_outbox SET status='processing',locked_at=now(),attempts=attempts+1
 WHERE id IN (SELECT id FROM public.academy_outbox WHERE status IN ('pending','retry') AND due_at<=now() AND attempts<3 ORDER BY due_at FOR UPDATE SKIP LOCKED LIMIT least(p_limit,20)) RETURNING *;
END $$;

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('academy_register','academy_record_progress','academy_review_workbook','academy_tutor_budget','academy_reconcile_order','academy_claim_outbox','academy_write_budget') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
