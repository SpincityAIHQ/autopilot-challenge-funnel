
-- ==================================================================
-- AI AutoPilot Summit — Wave 2 tightening (forward-only)
-- ==================================================================

-- ---------- 1. Strict least-privilege ACLs on every private table ---------
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'challenge_registrations','challenge_payment_events','founder_seats',
    'summit_registrations','summit_vault_purchases','intensive_slots',
    'mentorship_applications','keynote_waitlist','marketing_consents',
    'entitlements','affiliate_clicks','summit_payment_events'
  ]) LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated, service_role', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', t);
  END LOOP;
END$$;

-- ---------- 2. vip_upgrade in entitlements CHECK ----------
ALTER TABLE public.entitlements DROP CONSTRAINT IF EXISTS entitlements_product_check;
ALTER TABLE public.entitlements
  ADD CONSTRAINT entitlements_product_check
  CHECK (product IN ('ga','vip','vault','intensive','vip_upgrade'));

-- ---------- 3. payment/booking status + refund_at ----------
ALTER TABLE public.summit_registrations
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

ALTER TABLE public.summit_vault_purchases
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

ALTER TABLE public.intensive_slots
  ADD COLUMN IF NOT EXISTS booking_status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS amount_cents integer,
  ADD COLUMN IF NOT EXISTS currency text;

-- ---------- 4. vip_upgrade purchases table ----------
CREATE TABLE IF NOT EXISTS public.summit_vip_upgrades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.summit_registrations(id) ON DELETE CASCADE,
  buyer_email text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  commas_payment_id text NOT NULL UNIQUE,
  payment_status text NOT NULL DEFAULT 'confirmed',
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.summit_vip_upgrades FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.summit_vip_upgrades TO service_role;
ALTER TABLE public.summit_vip_upgrades ENABLE ROW LEVEL SECURITY;

-- ---------- 5. Intensive eligibility (operator-managed) ----------
CREATE TABLE IF NOT EXISTS public.intensive_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_email text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'operator',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.intensive_eligibility FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intensive_eligibility TO service_role;
ALTER TABLE public.intensive_eligibility ENABLE ROW LEVEL SECURITY;

-- ---------- 6. Access tokens (hash-only, single-use, expiring) ----------
CREATE TABLE IF NOT EXISTS public.access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  buyer_email text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('ga','vip','vault','intensive','vip_upgrade')),
  registration_id uuid REFERENCES public.summit_registrations(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.access_tokens FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_tokens TO service_role;
ALTER TABLE public.access_tokens ENABLE ROW LEVEL SECURITY;

-- ---------- 7. Delivery outbox ----------
CREATE TABLE IF NOT EXISTS public.delivery_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('email','sms','ai_call')),
  provider text,
  destination_hash text NOT NULL,
  template_key text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sending','sent','failed','suppressed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.delivery_outbox FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_outbox TO service_role;
ALTER TABLE public.delivery_outbox ENABLE ROW LEVEL SECURITY;

-- ---------- 8. Versioned consent events ----------
CREATE TABLE IF NOT EXISTS public.consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_email text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms','ai_call')),
  action text NOT NULL CHECK (action IN ('granted','revoked')),
  copy_version text NOT NULL,
  source text,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.consent_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_events TO service_role;
ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;

-- ---------- 9. Replace fulfillment RPC with stricter rules ----------
DROP FUNCTION IF EXISTS public.fulfill_summit_payment(
  text,text,integer,text,text,text,text,jsonb,jsonb);

CREATE OR REPLACE FUNCTION public.fulfill_summit_payment(
  _product text,
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
  _ga_reg uuid;
BEGIN
  IF _product NOT IN ('ga','vip','vault','intensive','vip_upgrade') THEN
    RAISE EXCEPTION 'invalid product: %', _product USING ERRCODE = '22023';
  END IF;
  IF _commas_payment_id IS NULL OR length(_commas_payment_id) = 0 THEN
    RAISE EXCEPTION 'commas_payment_id required' USING ERRCODE = '22023';
  END IF;
  IF _amount_cents IS NULL OR _amount_cents < 0 THEN
    RAISE EXCEPTION 'amount_cents must be >= 0' USING ERRCODE = '22023';
  END IF;
  IF _email IS NULL OR length(_email) = 0 THEN
    RAISE EXCEPTION 'email required' USING ERRCODE = '22023';
  END IF;

  -- ============ GA / VIP admission ============
  IF _product IN ('ga','vip') THEN
    SELECT r.id INTO _existing_id FROM public.summit_registrations r
      WHERE r.commas_payment_id = _commas_payment_id LIMIT 1;
    IF _existing_id IS NOT NULL THEN
      registration_id := _existing_id; slot_number := NULL; already_existed := true;
      RETURN NEXT; RETURN;
    END IF;
    INSERT INTO public.summit_registrations
      (full_name, email, phone, tier, amount_cents, currency,
       commas_payment_id, status, payment_status, first_touch, last_touch)
      VALUES (_full_name, _email, _phone, _product, _amount_cents,
              coalesce(_currency,'USD'), _commas_payment_id,
              'confirmed', 'confirmed', _first_touch, _last_touch)
      RETURNING id INTO _new_id;
    INSERT INTO public.entitlements (registration_id, buyer_email, product)
      VALUES (_new_id, _email, _product)
      ON CONFLICT (buyer_email, product) DO NOTHING;
    registration_id := _new_id; slot_number := NULL; already_existed := false;
    RETURN NEXT; RETURN;
  END IF;

  -- ============ VIP upgrade (requires prior verified GA) ============
  IF _product = 'vip_upgrade' THEN
    IF EXISTS (SELECT 1 FROM public.summit_vip_upgrades WHERE commas_payment_id = _commas_payment_id) THEN
      SELECT registration_id INTO _existing_id FROM public.summit_vip_upgrades
        WHERE commas_payment_id = _commas_payment_id LIMIT 1;
      registration_id := _existing_id; slot_number := NULL; already_existed := true;
      RETURN NEXT; RETURN;
    END IF;
    SELECT r.id INTO _ga_reg
      FROM public.summit_registrations r
      WHERE lower(r.email) = lower(_email)
        AND r.tier = 'ga'
        AND r.payment_status = 'confirmed'
      ORDER BY r.created_at DESC LIMIT 1
      FOR UPDATE;
    IF _ga_reg IS NULL THEN
      RAISE EXCEPTION 'vip_upgrade requires an active GA registration' USING ERRCODE = 'P0002';
    END IF;
    INSERT INTO public.summit_vip_upgrades
      (registration_id, buyer_email, amount_cents, currency, commas_payment_id)
      VALUES (_ga_reg, _email, _amount_cents, coalesce(_currency,'USD'), _commas_payment_id);
    UPDATE public.summit_registrations SET tier = 'vip' WHERE id = _ga_reg;
    INSERT INTO public.entitlements (registration_id, buyer_email, product)
      VALUES (_ga_reg, _email, 'vip')
      ON CONFLICT (buyer_email, product) DO NOTHING;
    INSERT INTO public.entitlements (registration_id, buyer_email, product)
      VALUES (_ga_reg, _email, 'vip_upgrade')
      ON CONFLICT (buyer_email, product) DO NOTHING;
    registration_id := _ga_reg; slot_number := NULL; already_existed := false;
    RETURN NEXT; RETURN;
  END IF;

  -- ============ Vault (requires prior GA or VIP) ============
  IF _product = 'vault' THEN
    IF EXISTS (SELECT 1 FROM public.summit_vault_purchases WHERE commas_payment_id = _commas_payment_id) THEN
      SELECT registration_id INTO _existing_id FROM public.summit_vault_purchases
        WHERE commas_payment_id = _commas_payment_id LIMIT 1;
      registration_id := _existing_id; slot_number := NULL; already_existed := true;
      RETURN NEXT; RETURN;
    END IF;
    SELECT r.id INTO _existing_id
      FROM public.summit_registrations r
      WHERE lower(r.email) = lower(_email)
        AND r.payment_status = 'confirmed'
      ORDER BY r.created_at DESC LIMIT 1;
    IF _existing_id IS NULL THEN
      RAISE EXCEPTION 'vault requires an active GA or VIP registration' USING ERRCODE = 'P0002';
    END IF;
    INSERT INTO public.summit_vault_purchases
      (registration_id, buyer_email, amount_cents, currency, commas_payment_id, payment_status)
      VALUES (_existing_id, _email, _amount_cents, coalesce(_currency,'USD'),
              _commas_payment_id, 'confirmed');
    INSERT INTO public.entitlements (registration_id, buyer_email, product)
      VALUES (_existing_id, _email, 'vault')
      ON CONFLICT (buyer_email, product) DO NOTHING;
    registration_id := _existing_id; slot_number := NULL; already_existed := false;
    RETURN NEXT; RETURN;
  END IF;

  -- ============ Intensive (requires GA/VIP OR operator eligibility) ============
  IF _product = 'intensive' THEN
    IF EXISTS (SELECT 1 FROM public.intensive_slots WHERE commas_payment_id = _commas_payment_id) THEN
      SELECT s.slot_number INTO _existing_slot FROM public.intensive_slots
        WHERE commas_payment_id = _commas_payment_id LIMIT 1;
      registration_id := NULL; slot_number := _existing_slot; already_existed := true;
      RETURN NEXT; RETURN;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.summit_registrations
        WHERE lower(email) = lower(_email) AND payment_status = 'confirmed'
      UNION ALL
      SELECT 1 FROM public.intensive_eligibility
        WHERE lower(buyer_email) = lower(_email)
    ) THEN
      RAISE EXCEPTION 'intensive requires Summit registration or eligibility' USING ERRCODE = 'P0002';
    END IF;
    SELECT s.slot_number INTO _slot FROM public.intensive_slots s
      WHERE s.claimed_at IS NULL
      ORDER BY s.slot_number ASC LIMIT 1
      FOR UPDATE SKIP LOCKED;
    IF _slot IS NULL THEN
      RAISE EXCEPTION 'No intensive slots remaining' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.intensive_slots
      SET buyer_email = _email,
          commas_payment_id = _commas_payment_id,
          claimed_at = now(),
          booking_status = 'confirmed',
          amount_cents = _amount_cents,
          currency = coalesce(_currency,'USD')
      WHERE slot_number = _slot AND claimed_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Intensive slot race lost' USING ERRCODE = 'P0001';
    END IF;
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

-- ---------- 10. Atomic refund/dispute reversal ----------
CREATE OR REPLACE FUNCTION public.reverse_summit_payment(
  _commas_payment_id text
) RETURNS TABLE(reversed_product text, released_slot integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _reg_id uuid;
  _tier text;
  _slot integer;
  _email text;
BEGIN
  IF _commas_payment_id IS NULL OR length(_commas_payment_id) = 0 THEN
    RAISE EXCEPTION 'commas_payment_id required' USING ERRCODE = '22023';
  END IF;

  -- GA / VIP admission reversal
  SELECT id, tier, email INTO _reg_id, _tier, _email
    FROM public.summit_registrations
    WHERE commas_payment_id = _commas_payment_id LIMIT 1;
  IF _reg_id IS NOT NULL THEN
    UPDATE public.summit_registrations
      SET payment_status = 'refunded', refunded_at = now(), status = 'refunded'
      WHERE id = _reg_id;
    UPDATE public.entitlements SET revoked_at = now()
      WHERE registration_id = _reg_id AND revoked_at IS NULL;
    reversed_product := _tier; released_slot := NULL;
    RETURN NEXT; RETURN;
  END IF;

  -- VIP upgrade reversal (downgrades back to GA)
  SELECT registration_id, buyer_email INTO _reg_id, _email
    FROM public.summit_vip_upgrades
    WHERE commas_payment_id = _commas_payment_id LIMIT 1;
  IF _reg_id IS NOT NULL THEN
    UPDATE public.summit_vip_upgrades
      SET payment_status = 'refunded', refunded_at = now()
      WHERE commas_payment_id = _commas_payment_id;
    UPDATE public.summit_registrations SET tier = 'ga' WHERE id = _reg_id;
    UPDATE public.entitlements SET revoked_at = now()
      WHERE registration_id = _reg_id AND product IN ('vip','vip_upgrade') AND revoked_at IS NULL;
    reversed_product := 'vip_upgrade'; released_slot := NULL;
    RETURN NEXT; RETURN;
  END IF;

  -- Vault reversal
  SELECT registration_id, buyer_email INTO _reg_id, _email
    FROM public.summit_vault_purchases
    WHERE commas_payment_id = _commas_payment_id LIMIT 1;
  IF FOUND THEN
    UPDATE public.summit_vault_purchases
      SET payment_status = 'refunded', refunded_at = now(), status = 'refunded'
      WHERE commas_payment_id = _commas_payment_id;
    UPDATE public.entitlements SET revoked_at = now()
      WHERE buyer_email = _email AND product = 'vault' AND revoked_at IS NULL;
    reversed_product := 'vault'; released_slot := NULL;
    RETURN NEXT; RETURN;
  END IF;

  -- Intensive reversal (release the slot back into inventory)
  SELECT slot_number, buyer_email INTO _slot, _email
    FROM public.intensive_slots
    WHERE commas_payment_id = _commas_payment_id LIMIT 1;
  IF _slot IS NOT NULL THEN
    UPDATE public.intensive_slots
      SET buyer_email = NULL, commas_payment_id = NULL, claimed_at = NULL,
          booking_status = 'refunded', refunded_at = now()
      WHERE slot_number = _slot;
    UPDATE public.entitlements SET revoked_at = now()
      WHERE buyer_email = _email AND product = 'intensive' AND revoked_at IS NULL;
    reversed_product := 'intensive'; released_slot := _slot;
    RETURN NEXT; RETURN;
  END IF;

  reversed_product := NULL; released_slot := NULL;
  RETURN NEXT; RETURN;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.reverse_summit_payment(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_summit_payment(text) TO service_role;

-- ---------- 11. Entitlement lookup by token hash (read-only, safe shape) ----------
CREATE OR REPLACE FUNCTION public.entitlement_by_token_hash(_token_hash text)
RETURNS TABLE(
  buyer_email text,
  scope text,
  registration_id uuid,
  expires_at timestamptz,
  used_at timestamptz,
  active boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.buyer_email, t.scope, t.registration_id, t.expires_at, t.used_at,
    (t.used_at IS NULL
     AND t.expires_at > now()
     AND EXISTS (
       SELECT 1 FROM public.entitlements e
       WHERE e.buyer_email = t.buyer_email
         AND e.product = t.scope
         AND e.revoked_at IS NULL
     )) AS active
  FROM public.access_tokens t
  WHERE t.token_hash = _token_hash
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.entitlement_by_token_hash(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.entitlement_by_token_hash(text) TO service_role;

-- ---------- 12. Lock every remaining SECURITY DEFINER function ----------
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.claim_lowest_intensive_slot(text,text) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.claim_lowest_intensive_slot(text,text) TO service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- Keep intensive_slots_remaining callable by anon/authenticated (integer-only aggregate).
REVOKE EXECUTE ON FUNCTION public.intensive_slots_remaining() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intensive_slots_remaining() TO anon, authenticated, service_role;
