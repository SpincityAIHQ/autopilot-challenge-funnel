-- Apply to the existing Summit project. No messages are sent by this script.
BEGIN;
ALTER TABLE public.academy_profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT true;

-- The API supplies only an already verified auth user's identity, never request JSON.
-- service_role cannot SELECT auth.users; do not broaden its auth table privileges.
CREATE OR REPLACE FUNCTION public.academy_prepare_customer(p_user uuid,p_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE was_new boolean;
BEGIN
 IF p_user IS NULL OR p_email IS NULL OR position('@' in p_email)=0 THEN RAISE EXCEPTION 'Verified account identity required'; END IF;
 INSERT INTO public.academy_profiles(user_id,email,timezone,marketing_consent,sms_consent,consent_version,onboarding_complete)
 VALUES(p_user,lower(trim(p_email)),'UTC',false,false,'account-created-no-optional-consent-2026-09-10',false)
 ON CONFLICT(user_id) DO NOTHING;
 was_new:=FOUND;
 IF was_new THEN
  INSERT INTO public.academy_events(user_id,name,payload) VALUES(p_user,'webinar_registered','{"purpose":"transactional","origin":"verified_account"}');
  INSERT INTO public.academy_outbox(dedup_key,user_id,name,payload,due_at)
  VALUES('webinar-registration:'||p_user,p_user,'webinar_registered','{"purpose":"transactional"}',now()) ON CONFLICT(dedup_key) DO NOTHING;
 END IF;
 RETURN was_new;
END $$;

CREATE OR REPLACE FUNCTION public.academy_queue_contact_update(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 INSERT INTO public.academy_outbox(dedup_key,user_id,name,payload,due_at)
 SELECT 'customer-preferences:'||p_user||':'||extract(epoch from updated_at)::text,p_user,'customer_preferences_updated',
   '{"purpose":"customer_sync","send_email":false,"send_sms":false}',now()
 FROM public.academy_profiles WHERE user_id=p_user ON CONFLICT(dedup_key) DO NOTHING;
END $$;

-- The five-argument wrapper is the only default path. A seven-argument overload
-- with defaults makes legacy SQL/PostgREST calls ambiguous (42725). Recreate this
-- exact signature inside the transaction, without CASCADE and without defaults.
DROP FUNCTION IF EXISTS public.academy_register(uuid,text,text,boolean,jsonb,text,boolean);
CREATE FUNCTION public.academy_register(p_user uuid,p_email text,p_timezone text,p_consent boolean,p_attribution jsonb,p_phone text,p_sms boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_sms boolean; was_complete boolean;
BEGIN
 PERFORM public.academy_prepare_customer(p_user,p_email);
 SELECT onboarding_complete INTO was_complete FROM public.academy_profiles WHERE user_id=p_user FOR UPDATE;
 v_sms:=coalesce(p_sms,false) AND p_phone IS NOT NULL AND length(p_phone)>=7;
 UPDATE public.academy_profiles SET email=lower(trim(p_email)),timezone=p_timezone,marketing_consent=coalesce(p_consent,false),
 consent_version='academy-marketing-2026-09-06',consent_at=now(),updated_at=now(),onboarding_complete=true,
 phone=CASE WHEN p_phone IS NULL OR length(p_phone)<7 THEN phone ELSE p_phone END,
 sms_consent=v_sms,sms_consent_at=CASE WHEN v_sms THEN now() ELSE NULL END,
 attribution=CASE WHEN p_consent THEN CASE WHEN attribution='{}' THEN p_attribution ELSE attribution END ELSE '{}' END
 WHERE user_id=p_user;
 PERFORM public.academy_queue_contact_update(p_user);
 IF NOT was_complete AND p_consent THEN
  INSERT INTO public.academy_outbox(dedup_key,user_id,name,due_at)
  VALUES('webinar-start-reminder:'||p_user,p_user,'webinar_not_started',now()+interval '1 day') ON CONFLICT(dedup_key) DO NOTHING;
 END IF;
 IF NOT was_complete AND v_sms THEN
  INSERT INTO public.academy_outbox(dedup_key,user_id,name,payload,due_at)
  VALUES('webinar-registration-sms:'||p_user,p_user,'webinar_registered_sms','{"purpose":"transactional","channel":"sms"}',now()) ON CONFLICT(dedup_key) DO NOTHING;
 END IF;
 IF NOT p_consent THEN
  UPDATE public.academy_outbox SET status='cancelled',completed_at=now()
  WHERE user_id=p_user AND (name='webinar_not_started' OR name LIKE 'learning_%') AND status IN ('pending','retry');
 END IF;
END $$;

-- Preserve the older caller signature without duplicate welcome logic.
CREATE OR REPLACE FUNCTION public.academy_register(p_user uuid,p_email text,p_timezone text,p_consent boolean,p_attribution jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE p public.academy_profiles;
BEGIN
 SELECT * INTO p FROM public.academy_profiles WHERE user_id=p_user;
 PERFORM public.academy_register(p_user,p_email,p_timezone,p_consent,p_attribution,p.phone,coalesce(p.sms_consent,false));
END $$;

CREATE OR REPLACE FUNCTION public.academy_queue_customer_return(p_user uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE queued boolean;
BEGIN
 INSERT INTO public.academy_outbox(dedup_key,user_id,name,payload,due_at)
 SELECT 'customer-return:'||p_user||':'||to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD'),p_user,'customer_returned','{"purpose":"customer_sync","send_email":false,"send_sms":false}',now()
 FROM public.academy_profiles WHERE user_id=p_user AND onboarding_complete AND created_at<now()-interval '1 day'
 ON CONFLICT(dedup_key) DO NOTHING;
 queued:=FOUND; RETURN queued;
END $$;

CREATE OR REPLACE FUNCTION public.academy_queue_access_activation(p_user uuid,p_hash text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c public.academy_access_codes; p public.academy_profiles;
BEGIN
 SELECT * INTO c FROM public.academy_access_codes WHERE code_hash=p_hash AND redeemed_by=p_user AND access_until>now();
 SELECT * INTO p FROM public.academy_profiles WHERE user_id=p_user;
 IF c.id IS NULL OR p.user_id IS NULL OR c.email<>p.email THEN RETURN; END IF;
 INSERT INTO public.academy_outbox(dedup_key,user_id,name,payload,due_at)
 VALUES('access-activated:'||c.id||':'||c.generation,p_user,'access_activated',jsonb_build_object('codeId',c.id,'generation',c.generation,'purpose','transactional'),now()) ON CONFLICT(dedup_key) DO NOTHING;
 IF p.sms_consent AND p.phone IS NOT NULL THEN
  INSERT INTO public.academy_outbox(dedup_key,user_id,name,payload,due_at)
  VALUES('access-activated-sms:'||c.id||':'||c.generation,p_user,'access_activated_sms',jsonb_build_object('codeId',c.id,'generation',c.generation,'purpose','transactional','channel','sms'),now()) ON CONFLICT(dedup_key) DO NOTHING;
 END IF;
END $$;

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='public'::regnamespace
 AND proname IN ('academy_prepare_customer','academy_register','academy_queue_customer_return','academy_queue_access_activation','academy_queue_contact_update') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
