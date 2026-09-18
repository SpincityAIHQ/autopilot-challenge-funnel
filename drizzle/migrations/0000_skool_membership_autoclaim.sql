-- Bind Skool membership grants to a confirmed account automatically at sign-in.
-- Scoped strictly to the 'skool-membership' batch; no other import is touched.
CREATE OR REPLACE FUNCTION academy_private.claim_skool_membership(p_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE verified_email text; claimed integer := 0;
BEGIN
  IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN RETURN 0; END IF;
  SELECT lower(btrim(u.email)) INTO verified_email
    FROM auth.users u
   WHERE u.id = p_user AND u.email_confirmed_at IS NOT NULL
     AND coalesce(u.is_anonymous, false) = false;
  IF verified_email IS NULL OR verified_email = '' THEN RETURN 0; END IF;

  WITH newly_claimed AS (
    UPDATE public.academy_imported_tickets t
       SET claimed_by = p_user, claimed_at = now(), updated_at = now()
     WHERE t.source_batch = 'skool-membership'
       AND t.email = verified_email AND t.active AND t.claimed_by IS NULL
       AND (t.expires_at IS NULL OR t.expires_at > now())
    RETURNING t.id, t.tier
  ), logged AS (
    INSERT INTO public.academy_events(user_id, name, payload)
    SELECT p_user, 'imported_ticket_claimed',
           jsonb_build_object('ticketId', c.id, 'tier', c.tier, 'batch', 'skool-membership')
      FROM newly_claimed c
    RETURNING 1
  )
  SELECT count(*)::int INTO claimed FROM logged;
  RETURN claimed;
END $$;

REVOKE ALL ON FUNCTION academy_private.claim_skool_membership(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION academy_private.claim_skool_membership(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.academy_prepare_customer(p_user uuid, p_email text)
RETURNS boolean LANGUAGE plpgsql SET search_path TO '' AS $function$
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
 -- Owner-authorized Q4 cohort binding only; never touches other purchase tickets.
 PERFORM academy_private.claim_q4_cohort(p_user);
 -- Skool membership binding; only the 'skool-membership' batch.
 PERFORM academy_private.claim_skool_membership(p_user);
 RETURN was_new;
END $function$;