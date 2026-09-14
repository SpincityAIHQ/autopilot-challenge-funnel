
CREATE OR REPLACE FUNCTION academy_private.claim_q4_cohort(p_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE verified_email text; proof jsonb; confirmed timestamptz; eligible boolean; claimed integer := 0;
BEGIN
  -- Not exposed in the API schema; EXECUTE is granted to service_role only.
  SELECT lower(btrim(u.email)), u.raw_app_meta_data->'academy_email_ownership', u.email_confirmed_at
    INTO verified_email, proof, confirmed
    FROM auth.users u
    WHERE u.id = p_user AND u.email_confirmed_at IS NOT NULL
      AND coalesce(u.is_anonymous, false) = false;
  IF verified_email IS NULL OR verified_email = '' THEN RETURN 0; END IF;

  eligible := (
    proof IS NOT NULL
    AND (proof->>'version') = '1'
    AND lower(btrim(coalesce(proof->>'email',''))) = verified_email
    AND (proof->>'verifiedAt') IS NOT NULL
    AND (proof->>'emailConfirmedAt')::timestamptz = confirmed
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
