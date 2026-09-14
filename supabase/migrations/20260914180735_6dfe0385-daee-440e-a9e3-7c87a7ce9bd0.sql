
INSERT INTO public.academy_imported_tickets
  (source_kind, source_key, source_batch, source_reference, email, tier, active, terms_note, expires_at)
SELECT 'owner_grant',
       'q4-cohort-2026-09-14:' || e.email || ':' || t.tier,
       'q4-cohort-2026-09-14',
       'owner-authorized 2026-09-14 Q4 cohort learner access (no purchase recorded)',
       e.email, t.tier, true,
       'Owner-authorized Q4 cohort access. Not a purchase; granted by site owner on 2026-09-14.',
       CASE WHEN t.tier = 'accelerator' THEN timestamptz '2027-01-01 05:00:00+00' ELSE NULL END
FROM (VALUES
  ('tsc.elite.assist@gmail.com'),('djjosofine@gmail.com'),('higherearnings23@gmail.com'),
  ('architect@hitsuyoaku.io'),('che@brickhousemindset.com'),('syncerenewman9@gmail.com'),
  ('partnersinvolvingtheyouth@gmail.com'),('afltrust@proton.me'),('dpetties7@gmail.com'),
  ('info@frntlnwrldtechservices.network')
) AS e(email)
CROSS JOIN (VALUES ('vault'),('accelerator')) AS t(tier)
ON CONFLICT (source_kind, source_key) DO NOTHING;

-- Scoped auto-claim: ONLY the owner-authorized Q4 cohort batch, and only for a
-- confirmed account that either carries a valid native email-ownership proof or
-- already has legitimately bound imported grants at the same verified address.
CREATE OR REPLACE FUNCTION academy_private.claim_q4_cohort(p_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE verified_email text; proof jsonb; eligible boolean; claimed integer := 0;
BEGIN
  IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN RETURN 0; END IF;
  SELECT lower(btrim(u.email)), u.raw_app_meta_data->'academy_email_ownership'
    INTO verified_email, proof
    FROM auth.users u
    WHERE u.id = p_user AND u.email_confirmed_at IS NOT NULL
      AND coalesce(u.is_anonymous, false) = false
      AND (u.raw_app_meta_data->'academy_email_ownership'->>'emailConfirmedAt' IS NULL
           OR true);
  IF verified_email IS NULL OR verified_email = '' THEN RETURN 0; END IF;

  eligible := (
    proof IS NOT NULL
    AND (proof->>'version') = '1'
    AND lower(btrim(coalesce(proof->>'email',''))) = verified_email
    AND (proof->>'verifiedAt') IS NOT NULL
    AND (proof->>'emailConfirmedAt') IS NOT NULL
    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user
                 AND to_char(u.email_confirmed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS')
                   = to_char((proof->>'emailConfirmedAt')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS'))
  ) OR EXISTS (
    SELECT 1 FROM public.academy_imported_tickets t
     WHERE t.claimed_by = p_user AND t.email = verified_email AND t.active
  );
  IF NOT eligible THEN RETURN 0; END IF;

  WITH newly_claimed AS (
    UPDATE public.academy_imported_tickets t
       SET claimed_by = p_user, claimed_at = now(), updated_at = now()
     WHERE t.source_batch = 'q4-cohort-2026-09-14'
       AND t.source_kind = 'owner_grant'
       AND t.email = verified_email AND t.active AND t.claimed_by IS NULL
       AND (t.expires_at IS NULL OR t.expires_at > now())
    RETURNING t.id, t.tier
  ), logged AS (
    INSERT INTO public.academy_events(user_id, name, payload)
    SELECT p_user, 'imported_ticket_claimed',
           jsonb_build_object('ticketId', c.id, 'tier', c.tier, 'batch', 'q4-cohort-2026-09-14')
      FROM newly_claimed c
    RETURNING 1
  )
  SELECT count(*) INTO claimed FROM logged;
  RETURN claimed;
END $$;
REVOKE ALL ON FUNCTION academy_private.claim_q4_cohort(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION academy_private.claim_q4_cohort(uuid) TO service_role;

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
 RETURN was_new;
END $function$;
