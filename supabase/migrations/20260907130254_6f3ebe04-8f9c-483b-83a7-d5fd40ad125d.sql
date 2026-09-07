ALTER TABLE public.academy_profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS sms_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;

CREATE OR REPLACE FUNCTION public.academy_register(p_user uuid, p_email text, p_timezone text, p_consent boolean, p_attribution jsonb, p_phone text DEFAULT NULL, p_sms boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE was_new boolean; v_sms boolean; BEGIN
 v_sms := coalesce(p_sms,false) AND p_phone IS NOT NULL AND length(p_phone) >= 7;
 INSERT INTO public.academy_profiles(user_id,email,timezone,marketing_consent,consent_version,attribution)
 VALUES(p_user,p_email,p_timezone,p_consent,'academy-marketing-2026-09-06',p_attribution) ON CONFLICT DO NOTHING;
 was_new:=FOUND;
 UPDATE public.academy_profiles SET email=p_email,timezone=p_timezone,marketing_consent=p_consent,
 consent_at=now(),updated_at=now(),
 phone=CASE WHEN p_phone IS NULL OR length(p_phone)<7 THEN phone ELSE p_phone END,
 sms_consent=v_sms,
 sms_consent_at=CASE WHEN v_sms THEN now() ELSE NULL END,
 attribution=CASE WHEN p_consent THEN CASE WHEN attribution='{}' THEN p_attribution ELSE attribution END ELSE '{}' END WHERE user_id=p_user;
 IF was_new THEN
 INSERT INTO public.academy_events(user_id,name) VALUES(p_user,'webinar_registered');
 INSERT INTO public.academy_outbox(dedup_key,user_id,name,due_at) VALUES
 ('webinar-registration:'||p_user,p_user,'webinar_registered',now()),
 ('webinar-start-reminder:'||p_user,p_user,'webinar_not_started',now()+interval '1 day');
 END IF;
 IF NOT p_consent THEN UPDATE public.academy_outbox SET status='cancelled',completed_at=now() WHERE user_id=p_user AND status IN ('pending','retry'); END IF;
END $function$;

REVOKE ALL ON FUNCTION public.academy_register(uuid,text,text,boolean,jsonb,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_register(uuid,text,text,boolean,jsonb,text,boolean) TO service_role;