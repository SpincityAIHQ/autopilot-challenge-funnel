-- Historical Summit purchases are independent of Shopify order reconciliation.
-- Import source records privately; never commit customer rows or claimed IDs.
BEGIN;
CREATE TABLE IF NOT EXISTS public.academy_imported_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind text NOT NULL DEFAULT 'legacy_purchase_csv',
  source_key text NOT NULL,
  source_batch text NOT NULL,
  source_reference text,
  email text NOT NULL CHECK (email = lower(btrim(email)) AND position('@' in email) > 1),
  tier text NOT NULL CHECK (tier IN ('ga', 'vip', 'vault', 'accelerator')),
  active boolean NOT NULL DEFAULT true,
  terms_note text NOT NULL,
  expires_at timestamptz,
  CHECK (tier <> 'accelerator' OR expires_at IS NOT NULL),
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_kind, source_key)
);
CREATE INDEX IF NOT EXISTS academy_imported_tickets_email
  ON public.academy_imported_tickets(email) WHERE active;
CREATE INDEX IF NOT EXISTS academy_imported_tickets_user
  ON public.academy_imported_tickets(claimed_by) WHERE active;
ALTER TABLE public.academy_imported_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.academy_imported_tickets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_imported_tickets TO service_role;

CREATE SCHEMA IF NOT EXISTS academy_private;
REVOKE ALL ON SCHEMA academy_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA academy_private TO service_role;

-- The service-only definer reads Auth identity without granting table access.
-- Browser callers cannot select the purchaser roster or call these functions.
CREATE OR REPLACE FUNCTION academy_private.has_imported_ticket(p_user uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM auth.users u JOIN public.academy_imported_tickets t
      ON t.email = lower(btrim(u.email))
    WHERE u.id = p_user AND u.email_confirmed_at IS NOT NULL
      AND t.active AND (t.expires_at IS NULL OR t.expires_at > now())
      AND (t.claimed_by IS NULL OR t.claimed_by = u.id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION academy_private.claim_imported_tickets(p_user uuid)
RETURNS TABLE(tier text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE verified_email text;
BEGIN
  IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED';
  END IF;
  SELECT lower(btrim(u.email)) INTO verified_email FROM auth.users u
    WHERE u.id = p_user AND u.email_confirmed_at IS NOT NULL;
  IF verified_email IS NULL OR verified_email = '' THEN RETURN; END IF;
  WITH newly_claimed AS (
    UPDATE public.academy_imported_tickets t
      SET claimed_by = p_user, claimed_at = now(), updated_at = now()
      WHERE t.email = verified_email AND t.active AND t.claimed_by IS NULL
        AND (t.expires_at IS NULL OR t.expires_at > now())
      RETURNING t.id, t.tier
  )
  INSERT INTO public.academy_events(user_id, name, payload)
    SELECT p_user, 'imported_ticket_claimed', jsonb_build_object('ticketId', c.id, 'tier', c.tier)
    FROM newly_claimed c;
  RETURN QUERY SELECT DISTINCT t.tier FROM public.academy_imported_tickets t
    WHERE t.claimed_by = p_user AND t.email = verified_email AND t.active
      AND (t.expires_at IS NULL OR t.expires_at > now());
END;
$$;
REVOKE ALL ON FUNCTION academy_private.has_imported_ticket(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION academy_private.claim_imported_tickets(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION academy_private.has_imported_ticket(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION academy_private.claim_imported_tickets(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.academy_has_imported_ticket(p_user uuid)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT academy_private.has_imported_ticket(p_user);
$$;
CREATE OR REPLACE FUNCTION public.academy_claim_imported_tickets(p_user uuid)
RETURNS TABLE(tier text) LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT * FROM academy_private.claim_imported_tickets(p_user);
$$;
REVOKE ALL ON FUNCTION public.academy_has_imported_ticket(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.academy_claim_imported_tickets(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_has_imported_ticket(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_claim_imported_tickets(uuid) TO service_role;
-- Explicit historical Accelerator purchases share existing avatar capacity limits.
-- Replay tiers never qualify; a fixed imported expiry is mandatory.
CREATE OR REPLACE FUNCTION public.academy_reserve_avatar(p_id uuid,p_user uuid,p_seconds integer,p_daily_seconds integer,p_global_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE used integer; total integer; BEGIN
 -- Serialize capacity reservation across users; minutes are reserved before provider creation.
 PERFORM pg_advisory_xact_lock(726901);
 IF NOT EXISTS(SELECT 1 FROM public.academy_access_codes c JOIN public.academy_grants g USING(order_id,line_id)
 JOIN public.academy_orders o USING(order_id) WHERE c.redeemed_by=p_user AND c.access_until>now() AND c.tier='accelerator'
 AND g.active AND NOT o.needs_review AND c.email=g.email AND c.tier=g.tier)
 AND NOT EXISTS(SELECT 1 FROM public.academy_imported_tickets t
 WHERE t.claimed_by=p_user AND t.tier='accelerator' AND t.active AND t.expires_at>now())
 THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.academy_avatar_sessions WHERE user_id=p_user AND status IN ('starting','active','unknown') AND expires_at>now()) THEN RETURN false; END IF;
 SELECT coalesce(sum(max_seconds),0) INTO used FROM public.academy_avatar_sessions WHERE user_id=p_user AND created_at>=date_trunc('day',now());
 SELECT coalesce(sum(max_seconds),0) INTO total FROM public.academy_avatar_sessions WHERE created_at>=date_trunc('day',now());
 IF used+p_seconds>p_daily_seconds OR total+p_seconds>p_global_seconds THEN RETURN false; END IF;
 INSERT INTO public.academy_avatar_sessions(id,user_id,max_seconds,expires_at) VALUES(p_id,p_user,p_seconds,now()+make_interval(secs=>p_seconds+120));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.academy_reserve_avatar(uuid,uuid,integer,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_reserve_avatar(uuid,uuid,integer,integer,integer) TO service_role;
COMMIT;
