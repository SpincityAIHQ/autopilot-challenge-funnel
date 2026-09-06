BEGIN;
CREATE TABLE public.academy_access_codes (
 id uuid PRIMARY KEY, generation uuid NOT NULL, order_id text NOT NULL, line_id text NOT NULL,
 email text NOT NULL, tier text NOT NULL, code_hash text NOT NULL UNIQUE CHECK(code_hash ~ '^[a-f0-9]{64}$'),
 access_hours integer NOT NULL CHECK(access_hours BETWEEN 1 AND 87600), terms_version text NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, redeemed_at timestamptz, access_until timestamptz,
 UNIQUE(order_id,line_id), FOREIGN KEY(order_id,line_id) REFERENCES public.academy_grants(order_id,line_id)
);
CREATE INDEX academy_codes_learner ON public.academy_access_codes(redeemed_by,access_until);
CREATE TABLE public.academy_access_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code_id uuid NOT NULL REFERENCES public.academy_access_codes(id) ON DELETE CASCADE,
 generation uuid NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','accepted','unknown','cancelled','failed')),
 due_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0, locked_at timestamptz, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(code_id,generation)
);
CREATE INDEX academy_access_delivery_pending ON public.academy_access_deliveries(status,created_at);
CREATE TABLE public.academy_avatar_sessions (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 provider_session_id text UNIQUE, status text NOT NULL DEFAULT 'starting' CHECK(status IN ('starting','active','ended','unknown')),
 max_seconds integer NOT NULL CHECK(max_seconds BETWEEN 60 AND 1200), created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, ended_at timestamptz
);
CREATE INDEX academy_avatar_user ON public.academy_avatar_sessions(user_id,created_at);
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['academy_access_codes','academy_access_deliveries','academy_avatar_sessions'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',n);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO service_role',n);
 END LOOP;
END $$;

CREATE FUNCTION public.academy_issue_access_code(p_id uuid,p_generation uuid,p_order text,p_line text,p_hash text,p_hours integer,p_terms text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE g public.academy_grants; c public.academy_access_codes; o public.academy_orders; BEGIN
 SELECT * INTO o FROM public.academy_orders WHERE order_id=p_order FOR UPDATE;
 SELECT * INTO g FROM public.academy_grants WHERE order_id=p_order AND line_id=p_line FOR UPDATE;
 IF g.order_id IS NULL OR NOT g.active OR g.quantity<>1 OR o.needs_review OR g.email='' OR p_terms='' THEN RETURN NULL; END IF;
 SELECT * INTO c FROM public.academy_access_codes WHERE order_id=p_order AND line_id=p_line FOR UPDATE;
 IF c.id IS NOT NULL AND c.tier<>g.tier THEN RETURN NULL; END IF;
 IF c.id IS NOT NULL AND c.redeemed_at IS NOT NULL THEN RETURN c.id; END IF;
 IF c.id IS NOT NULL AND c.expires_at>now() AND c.email=g.email THEN RETURN c.id; END IF;
 IF c.id IS NULL THEN
  INSERT INTO public.academy_access_codes(id,generation,order_id,line_id,email,tier,code_hash,access_hours,terms_version)
  VALUES(p_id,p_generation,p_order,p_line,g.email,g.tier,p_hash,p_hours,p_terms) RETURNING * INTO c;
 ELSE
  IF c.id<>p_id THEN RAISE EXCEPTION 'CODE_CHANGED_RETRY'; END IF;
  UPDATE public.academy_access_deliveries SET status='cancelled',completed_at=now() WHERE code_id=c.id AND status='pending';
  UPDATE public.academy_access_codes SET generation=p_generation,email=g.email,tier=g.tier,code_hash=p_hash,
   issued_at=now(),expires_at=now()+interval '30 days' WHERE id=c.id RETURNING * INTO c;
  -- Reissue retains the original purchased access term. It does not extend a redeemed entitlement.
 END IF;
 INSERT INTO public.academy_access_deliveries(code_id,generation) VALUES(c.id,c.generation) ON CONFLICT DO NOTHING;
 RETURN c.id;
END $$;

CREATE FUNCTION public.academy_redeem_access_code(p_user uuid,p_email text,p_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c public.academy_access_codes; g public.academy_grants; o public.academy_orders; BEGIN
 SELECT * INTO c FROM public.academy_access_codes WHERE code_hash=p_hash;
 IF c.id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO o FROM public.academy_orders WHERE order_id=c.order_id FOR UPDATE;
 SELECT * INTO g FROM public.academy_grants WHERE order_id=c.order_id AND line_id=c.line_id FOR UPDATE;
 SELECT * INTO c FROM public.academy_access_codes WHERE id=c.id FOR UPDATE;
 IF c.code_hash<>p_hash OR c.tier<>g.tier OR NOT g.active OR o.needs_review OR g.quantity<>1 OR g.email<>c.email OR c.email<>p_email THEN RETURN NULL; END IF;
 IF c.redeemed_at IS NOT NULL THEN
  IF c.redeemed_by IS DISTINCT FROM p_user OR c.access_until<=now() THEN RETURN NULL; END IF;
 ELSE
  IF c.expires_at<=now() THEN RETURN NULL; END IF;
  UPDATE public.academy_access_codes SET redeemed_by=p_user,redeemed_at=now(),access_until=now()+make_interval(hours=>access_hours)
  WHERE id=c.id RETURNING * INTO c;
  INSERT INTO public.academy_events(user_id,name,payload) VALUES(p_user,'access_redeemed',jsonb_build_object('tier',c.tier));
 END IF;
 RETURN jsonb_build_object('tier',c.tier,'accessUntil',c.access_until);
END $$;

CREATE FUNCTION public.academy_claim_access_deliveries(p_limit integer)
RETURNS SETOF public.academy_access_deliveries LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
 UPDATE public.academy_access_deliveries SET status='unknown' WHERE status='processing' AND locked_at<now()-interval '10 minutes';
 RETURN QUERY UPDATE public.academy_access_deliveries SET status='processing',locked_at=now(),attempts=attempts+1
 WHERE id IN (SELECT id FROM public.academy_access_deliveries WHERE status='pending' AND due_at<=now() AND attempts<5 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT least(greatest(p_limit,1),20)) RETURNING *;
END $$;

CREATE FUNCTION public.academy_reserve_avatar(p_id uuid,p_user uuid,p_seconds integer,p_daily_seconds integer,p_global_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE used integer; total integer; BEGIN
 -- Serialize capacity reservation across users; minutes are reserved before provider creation.
 PERFORM pg_advisory_xact_lock(726901);
 IF NOT EXISTS(SELECT 1 FROM public.academy_access_codes c JOIN public.academy_grants g USING(order_id,line_id)
 JOIN public.academy_orders o USING(order_id) WHERE c.redeemed_by=p_user AND c.access_until>now() AND c.tier='accelerator'
 AND g.active AND NOT o.needs_review AND c.email=g.email AND c.tier=g.tier) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.academy_avatar_sessions WHERE user_id=p_user AND status IN ('starting','active','unknown') AND expires_at>now()) THEN RETURN false; END IF;
 SELECT coalesce(sum(max_seconds),0) INTO used FROM public.academy_avatar_sessions WHERE user_id=p_user AND created_at>=date_trunc('day',now());
 SELECT coalesce(sum(max_seconds),0) INTO total FROM public.academy_avatar_sessions WHERE created_at>=date_trunc('day',now());
 IF used+p_seconds>p_daily_seconds OR total+p_seconds>p_global_seconds THEN RETURN false; END IF;
 INSERT INTO public.academy_avatar_sessions(id,user_id,max_seconds,expires_at) VALUES(p_id,p_user,p_seconds,now()+make_interval(secs=>p_seconds+120));
 RETURN true;
END $$;
CREATE FUNCTION public.academy_queue_learning_nudges()
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE inserted integer; BEGIN
 INSERT INTO public.academy_outbox(dedup_key,user_id,name,payload)
 SELECT DISTINCT ON(p.user_id)
 'learning:'||p.user_id||':'||p.lesson_id||':'||p.content_version||':'||n.signal,p.user_id,n.signal,
 jsonb_build_object('lessonId',p.lesson_id,'contentVersion',p.content_version)
 FROM public.academy_progress p JOIN public.academy_profiles a ON a.user_id=p.user_id
 CROSS JOIN LATERAL (SELECT CASE
 WHEN p.workbook_status='needs_revision' THEN 'learning_feedback'
 WHEN p.workbook_status='approved' THEN 'learning_approved'
 WHEN p.quiz_total>0 AND p.quiz_score::numeric/p.quiz_total<0.8 AND p.updated_at<now()-interval '2 hours' THEN 'learning_practice'
 WHEN p.workbook_status='draft' AND p.updated_at<now()-interval '3 days' THEN 'learning_stalled'
 END AS signal) n
 WHERE a.marketing_consent AND n.signal IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.academy_outbox x WHERE x.dedup_key='learning:'||p.user_id||':'||p.lesson_id||':'||p.content_version||':'||n.signal)
 AND NOT EXISTS(SELECT 1 FROM public.academy_outbox x WHERE x.user_id=p.user_id AND x.name LIKE 'learning_%' AND x.created_at>now()-interval '24 hours')
 ORDER BY p.user_id,CASE n.signal WHEN 'learning_feedback' THEN 1 WHEN 'learning_practice' THEN 2 WHEN 'learning_approved' THEN 3 ELSE 4 END
 LIMIT 100 ON CONFLICT(dedup_key) DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;RETURN inserted;
END $$;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
 ('academy_issue_access_code','academy_redeem_access_code','academy_claim_access_deliveries','academy_reserve_avatar','academy_queue_learning_nudges') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
