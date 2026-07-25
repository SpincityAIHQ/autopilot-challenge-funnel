
-- AI AutoPilot Summit remaster — non-destructive schema + ACL correction.
-- Keeps legacy tables (challenge_registrations, challenge_payment_events,
-- founder_seats) intact for audit history; adds Summit-era tables and
-- revokes broad privileges everywhere. All new tables are default-deny
-- with service_role-only grants; browser can never read PII.

-- ============ 1. Revoke broad privileges on legacy tables ============
REVOKE ALL ON public.challenge_registrations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.challenge_payment_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.founder_seats FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.challenge_registrations TO service_role;
GRANT ALL ON public.challenge_payment_events TO service_role;
GRANT ALL ON public.founder_seats TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_lowest_founder_seat(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_challenge_payment(text, text, boolean, integer, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lowest_founder_seat(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_challenge_payment(text, text, boolean, integer, text, text, text, text) TO service_role;
-- Keep founder_seats_remaining EXECUTE for anon/authenticated (safe aggregate).

-- ============ 2. Summit registrations (GA/VIP admission) ============
CREATE TABLE public.summit_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  tier text NOT NULL CHECK (tier IN ('ga','vip')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  commas_payment_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  first_touch jsonb,
  last_touch jsonb,
  email_marketing_consent boolean NOT NULL DEFAULT false,
  email_marketing_consent_at timestamptz,
  sms_marketing_consent boolean NOT NULL DEFAULT false,
  sms_marketing_consent_at timestamptz,
  ai_call_consent boolean NOT NULL DEFAULT false,
  ai_call_consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.summit_registrations TO service_role;
ALTER TABLE public.summit_registrations ENABLE ROW LEVEL SECURITY;
-- No policies: default-deny for anon/authenticated. service_role bypasses RLS.

-- ============ 3. Vault OTO purchases ($199) ============
CREATE TABLE public.summit_vault_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES public.summit_registrations(id) ON DELETE SET NULL,
  buyer_email text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  commas_payment_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.summit_vault_purchases TO service_role;
ALTER TABLE public.summit_vault_purchases ENABLE ROW LEVEL SECURITY;

-- ============ 4. Intensive slots (10-cap, atomic) ============
CREATE TABLE public.intensive_slots (
  slot_number integer PRIMARY KEY CHECK (slot_number BETWEEN 1 AND 10),
  registration_id uuid UNIQUE,
  buyer_email text,
  commas_payment_id text UNIQUE,
  claimed_at timestamptz
);
GRANT ALL ON public.intensive_slots TO service_role;
ALTER TABLE public.intensive_slots ENABLE ROW LEVEL SECURITY;
INSERT INTO public.intensive_slots (slot_number)
SELECT generate_series(1, 10);

CREATE OR REPLACE FUNCTION public.intensive_slots_remaining()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::int FROM public.intensive_slots WHERE claimed_at IS NULL;
$$;
REVOKE EXECUTE ON FUNCTION public.intensive_slots_remaining() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intensive_slots_remaining() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_lowest_intensive_slot(
  _buyer_email text,
  _commas_payment_id text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _slot integer;
BEGIN
  SELECT slot_number INTO _slot
    FROM public.intensive_slots
    WHERE claimed_at IS NULL
    ORDER BY slot_number ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  IF _slot IS NULL THEN
    RAISE EXCEPTION 'No intensive slots remaining (hard cap 10 reached)' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.intensive_slots
    SET buyer_email = _buyer_email,
        commas_payment_id = _commas_payment_id,
        claimed_at = now()
    WHERE slot_number = _slot AND claimed_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intensive slot race lost' USING ERRCODE = 'P0001';
  END IF;
  RETURN _slot;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_lowest_intensive_slot(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lowest_intensive_slot(text, text) TO service_role;

-- ============ 5. Mentorship applications ($8K, application-based) ============
CREATE TABLE public.mentorship_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  business text,
  goals text NOT NULL,
  current_offer text,
  monthly_revenue_band text,
  ready_to_invest boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mentorship_applications TO service_role;
ALTER TABLE public.mentorship_applications ENABLE ROW LEVEL SECURITY;

-- ============ 6. Keynote priority-access waitlist ============
CREATE TABLE public.keynote_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text NOT NULL,
  source text,
  first_touch jsonb,
  email_marketing_consent boolean NOT NULL DEFAULT false,
  email_marketing_consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.keynote_waitlist TO service_role;
ALTER TABLE public.keynote_waitlist ENABLE ROW LEVEL SECURITY;

-- ============ 7. Marketing consents (channel-separated, revocable) ============
CREATE TABLE public.marketing_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_email text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms','ai_call')),
  granted boolean NOT NULL,
  granted_at timestamptz,
  revoked_at timestamptz,
  source text,
  copy_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.marketing_consents TO service_role;
ALTER TABLE public.marketing_consents ENABLE ROW LEVEL SECURITY;

-- ============ 8. Entitlements ============
CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES public.summit_registrations(id) ON DELETE CASCADE,
  buyer_email text NOT NULL,
  product text NOT NULL CHECK (product IN ('ga','vip','vault','intensive')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  delivery_token_hash text,
  UNIQUE (buyer_email, product)
);
GRANT ALL ON public.entitlements TO service_role;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- ============ 9. Affiliate/attribution clicks ============
CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  landed_at timestamptz NOT NULL DEFAULT now(),
  session_id text,
  converted_registration_id uuid REFERENCES public.summit_registrations(id) ON DELETE SET NULL
);
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- ============ 10. Summit payment events (audit) ============
CREATE TABLE public.summit_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payment_id text,
  product text,
  payload jsonb,
  status text NOT NULL DEFAULT 'received',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT ALL ON public.summit_payment_events TO service_role;
ALTER TABLE public.summit_payment_events ENABLE ROW LEVEL SECURITY;

-- ============ 11. Atomic Summit fulfillment RPC ============
CREATE OR REPLACE FUNCTION public.fulfill_summit_payment(
  _product text,             -- 'ga' | 'vip' | 'vault' | 'intensive'
  _commas_payment_id text,
  _amount_cents integer,
  _currency text,
  _full_name text,
  _email text,
  _phone text,
  _first_touch jsonb,
  _last_touch jsonb
) RETURNS TABLE(
  registration_id uuid,
  slot_number integer,
  already_existed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _existing_id uuid;
  _existing_slot integer;
  _new_id uuid;
  _slot integer;
BEGIN
  IF _product NOT IN ('ga','vip','vault','intensive') THEN
    RAISE EXCEPTION 'invalid product: %', _product USING ERRCODE = '22023';
  END IF;
  IF _commas_payment_id IS NULL OR length(_commas_payment_id) = 0 THEN
    RAISE EXCEPTION 'commas_payment_id required' USING ERRCODE = '22023';
  END IF;
  IF _amount_cents IS NULL OR _amount_cents < 0 THEN
    RAISE EXCEPTION 'amount_cents must be >= 0' USING ERRCODE = '22023';
  END IF;

  -- Idempotency: return existing fulfillment if payment_id was already processed.
  IF _product IN ('ga','vip') THEN
    SELECT r.id INTO _existing_id FROM public.summit_registrations r
      WHERE r.commas_payment_id = _commas_payment_id LIMIT 1;
    IF _existing_id IS NOT NULL THEN
      registration_id := _existing_id; slot_number := NULL; already_existed := true;
      RETURN NEXT; RETURN;
    END IF;
    INSERT INTO public.summit_registrations
      (full_name, email, phone, tier, amount_cents, currency, commas_payment_id, status, first_touch, last_touch)
      VALUES (_full_name, _email, _phone, _product, _amount_cents,
              coalesce(_currency,'USD'), _commas_payment_id, 'confirmed', _first_touch, _last_touch)
      RETURNING id INTO _new_id;
    INSERT INTO public.entitlements (registration_id, buyer_email, product)
      VALUES (_new_id, _email, _product)
      ON CONFLICT (buyer_email, product) DO NOTHING;
    registration_id := _new_id; slot_number := NULL; already_existed := false;
    RETURN NEXT; RETURN;
  END IF;

  IF _product = 'vault' THEN
    IF EXISTS (SELECT 1 FROM public.summit_vault_purchases WHERE commas_payment_id = _commas_payment_id) THEN
      SELECT registration_id INTO _existing_id FROM public.summit_vault_purchases
        WHERE commas_payment_id = _commas_payment_id LIMIT 1;
      registration_id := _existing_id; slot_number := NULL; already_existed := true;
      RETURN NEXT; RETURN;
    END IF;
    -- Attach to existing registration if one matches by email.
    SELECT id INTO _existing_id FROM public.summit_registrations
      WHERE email = _email ORDER BY created_at DESC LIMIT 1;
    INSERT INTO public.summit_vault_purchases
      (registration_id, buyer_email, amount_cents, currency, commas_payment_id, status)
      VALUES (_existing_id, _email, _amount_cents, coalesce(_currency,'USD'), _commas_payment_id, 'confirmed');
    INSERT INTO public.entitlements (registration_id, buyer_email, product)
      VALUES (_existing_id, _email, 'vault')
      ON CONFLICT (buyer_email, product) DO NOTHING;
    registration_id := _existing_id; slot_number := NULL; already_existed := false;
    RETURN NEXT; RETURN;
  END IF;

  IF _product = 'intensive' THEN
    IF EXISTS (SELECT 1 FROM public.intensive_slots WHERE commas_payment_id = _commas_payment_id) THEN
      SELECT s.slot_number INTO _existing_slot FROM public.intensive_slots
        WHERE commas_payment_id = _commas_payment_id LIMIT 1;
      registration_id := NULL; slot_number := _existing_slot; already_existed := true;
      RETURN NEXT; RETURN;
    END IF;
    SELECT s.slot_number INTO _slot FROM public.intensive_slots s
      WHERE s.claimed_at IS NULL ORDER BY s.slot_number ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF _slot IS NULL THEN
      RAISE EXCEPTION 'No intensive slots remaining' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.intensive_slots
      SET buyer_email = _email, commas_payment_id = _commas_payment_id, claimed_at = now()
      WHERE slot_number = _slot AND claimed_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Intensive slot race lost' USING ERRCODE = 'P0001';
    END IF;
    -- Also grant an entitlement scoped by email.
    INSERT INTO public.entitlements (registration_id, buyer_email, product)
      VALUES (NULL, _email, 'intensive')
      ON CONFLICT (buyer_email, product) DO NOTHING;
    registration_id := NULL; slot_number := _slot; already_existed := false;
    RETURN NEXT; RETURN;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fulfill_summit_payment(text,text,integer,text,text,text,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_summit_payment(text,text,integer,text,text,text,text,jsonb,jsonb) TO service_role;

-- updated_at trigger on summit_registrations
DROP TRIGGER IF EXISTS trg_summit_reg_updated ON public.summit_registrations;
CREATE TRIGGER trg_summit_reg_updated
  BEFORE UPDATE ON public.summit_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
