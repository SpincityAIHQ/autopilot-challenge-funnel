
-- 1. Entitlements: add purchase-provenance column and rework uniqueness.
ALTER TABLE public.entitlements
  ADD COLUMN source_payment_id text;

-- Table currently has 0 rows; enforce NOT NULL.
ALTER TABLE public.entitlements
  ALTER COLUMN source_payment_id SET NOT NULL;

ALTER TABLE public.entitlements
  DROP CONSTRAINT IF EXISTS entitlements_buyer_email_product_key;

ALTER TABLE public.entitlements
  ADD CONSTRAINT entitlements_source_payment_product_key
  UNIQUE (source_payment_id, product);

CREATE INDEX IF NOT EXISTS entitlements_buyer_active_idx
  ON public.entitlements (buyer_email, product)
  WHERE revoked_at IS NULL;

-- 2. Fulfillment: record source_payment_id on every entitlement row.
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
)
RETURNS TABLE(registration_id uuid, slot_number integer, already_existed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _existing_id uuid; _existing_slot integer; _new_id uuid; _slot integer; _ga_reg uuid;
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

  IF _product IN ('ga','vip') THEN
    SELECT r.id INTO _existing_id FROM public.summit_registrations r
      WHERE r.commas_payment_id = _commas_payment_id LIMIT 1;
    IF _existing_id IS NOT NULL THEN
      registration_id := _existing_id; slot_number := NULL; already_existed := true;
      RETURN NEXT; RETURN;
    END IF;
    INSERT INTO public.summit_registrations
      (full_name, email, phone, tier, admission_product, amount_cents, currency,
       commas_payment_id, status, payment_status, first_touch, last_touch)
      VALUES (_full_name, _email, _phone, _product, _product, _amount_cents,
              coalesce(_currency,'USD'), _commas_payment_id,
              'confirmed', 'confirmed', _first_touch, _last_touch)
      RETURNING id INTO _new_id;
    INSERT INTO public.entitlements (registration_id, buyer_email, product, source_payment_id)
      VALUES (_new_id, _email, _product, _commas_payment_id)
      ON CONFLICT (source_payment_id, product) DO UPDATE
        SET registration_id = excluded.registration_id,
            granted_at = now(), revoked_at = NULL;
    registration_id := _new_id; slot_number := NULL; already_existed := false;
    RETURN NEXT; RETURN;
  END IF;

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
        AND r.admission_product = 'ga'
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
    -- Both entitlement rows carry the SAME source_payment_id (the upgrade payment).
    -- Refunding this payment revokes both rows; the GA entitlement (different
    -- source_payment_id) is untouched.
    INSERT INTO public.entitlements (registration_id, buyer_email, product, source_payment_id)
      VALUES (_ga_reg, _email, 'vip', _commas_payment_id)
      ON CONFLICT (source_payment_id, product) DO UPDATE
        SET registration_id = excluded.registration_id, granted_at = now(), revoked_at = NULL;
    INSERT INTO public.entitlements (registration_id, buyer_email, product, source_payment_id)
      VALUES (_ga_reg, _email, 'vip_upgrade', _commas_payment_id)
      ON CONFLICT (source_payment_id, product) DO UPDATE
        SET registration_id = excluded.registration_id, granted_at = now(), revoked_at = NULL;
    registration_id := _ga_reg; slot_number := NULL; already_existed := false;
    RETURN NEXT; RETURN;
  END IF;

  IF _product = 'vault' THEN
    IF EXISTS (SELECT 1 FROM public.summit_vault_purchases WHERE commas_payment_id = _commas_payment_id) THEN
      SELECT registration_id INTO _existing_id FROM public.summit_vault_purchases
        WHERE commas_payment_id = _commas_payment_id LIMIT 1;
      registration_id := _existing_id; slot_number := NULL; already_existed := true;
      RETURN NEXT; RETURN;
    END IF;
    SELECT r.id INTO _existing_id
      FROM public.summit_registrations r
      WHERE lower(r.email) = lower(_email) AND r.payment_status = 'confirmed'
      ORDER BY r.created_at DESC LIMIT 1;
    IF _existing_id IS NULL THEN
      RAISE EXCEPTION 'vault requires an active GA or VIP registration' USING ERRCODE = 'P0002';
    END IF;
    INSERT INTO public.summit_vault_purchases
      (registration_id, buyer_email, amount_cents, currency, commas_payment_id, payment_status)
      VALUES (_existing_id, _email, _amount_cents, coalesce(_currency,'USD'),
              _commas_payment_id, 'confirmed');
    INSERT INTO public.entitlements (registration_id, buyer_email, product, source_payment_id)
      VALUES (_existing_id, _email, 'vault', _commas_payment_id)
      ON CONFLICT (source_payment_id, product) DO UPDATE
        SET registration_id = excluded.registration_id, granted_at = now(), revoked_at = NULL;
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
      SET buyer_email = _email, commas_payment_id = _commas_payment_id,
          claimed_at = now(), booking_status = 'confirmed',
          amount_cents = _amount_cents, currency = coalesce(_currency,'USD')
      WHERE slot_number = _slot AND claimed_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Intensive slot race lost' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO public.entitlements (registration_id, buyer_email, product, source_payment_id)
      VALUES (NULL, _email, 'intensive', _commas_payment_id)
      ON CONFLICT (source_payment_id, product) DO UPDATE
        SET registration_id = excluded.registration_id, granted_at = now(), revoked_at = NULL;
    registration_id := NULL; slot_number := _slot; already_existed := false;
    RETURN NEXT; RETURN;
  END IF;
END; $function$;

-- 3. Reversal: revoke ONLY entitlement rows tied to the exact payment being refunded.
CREATE OR REPLACE FUNCTION public.reverse_summit_payment(_commas_payment_id text)
RETURNS TABLE(reversed_product text, released_slot integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _reg_id uuid; _admission text; _slot integer;
BEGIN
  IF _commas_payment_id IS NULL OR length(_commas_payment_id) = 0 THEN
    RAISE EXCEPTION 'commas_payment_id required' USING ERRCODE = '22023';
  END IF;

  -- Admission reversal (GA or direct VIP).
  SELECT id, admission_product INTO _reg_id, _admission
    FROM public.summit_registrations
    WHERE commas_payment_id = _commas_payment_id LIMIT 1;
  IF _reg_id IS NOT NULL THEN
    UPDATE public.summit_registrations
      SET payment_status = 'refunded', refunded_at = now(), status = 'refunded'
      WHERE id = _reg_id;
    -- Revoke ONLY entitlement rows whose source_payment_id is this admission payment.
    -- A later VIP upgrade / Vault / Intensive was recorded with its own payment ID
    -- and is untouched here.
    UPDATE public.entitlements SET revoked_at = now()
      WHERE source_payment_id = _commas_payment_id
        AND revoked_at IS NULL;
    reversed_product := _admission; released_slot := NULL;
    RETURN NEXT; RETURN;
  END IF;

  -- VIP upgrade reversal — restore GA tier, revoke ONLY the vip + vip_upgrade rows
  -- created by this specific upgrade payment.
  SELECT registration_id INTO _reg_id
    FROM public.summit_vip_upgrades
    WHERE commas_payment_id = _commas_payment_id LIMIT 1;
  IF _reg_id IS NOT NULL THEN
    UPDATE public.summit_vip_upgrades
      SET payment_status = 'refunded', refunded_at = now()
      WHERE commas_payment_id = _commas_payment_id;
    UPDATE public.summit_registrations SET tier = 'ga'
      WHERE id = _reg_id AND admission_product = 'ga';
    UPDATE public.entitlements SET revoked_at = now()
      WHERE source_payment_id = _commas_payment_id
        AND revoked_at IS NULL;
    reversed_product := 'vip_upgrade'; released_slot := NULL;
    RETURN NEXT; RETURN;
  END IF;

  -- Vault reversal — revoke ONLY the vault row tied to this Vault payment.
  IF EXISTS (SELECT 1 FROM public.summit_vault_purchases
             WHERE commas_payment_id = _commas_payment_id) THEN
    UPDATE public.summit_vault_purchases
      SET payment_status = 'refunded', refunded_at = now(), status = 'refunded'
      WHERE commas_payment_id = _commas_payment_id;
    UPDATE public.entitlements SET revoked_at = now()
      WHERE source_payment_id = _commas_payment_id
        AND revoked_at IS NULL;
    reversed_product := 'vault'; released_slot := NULL;
    RETURN NEXT; RETURN;
  END IF;

  -- Intensive reversal — release slot, revoke ONLY the intensive row for this payment.
  SELECT slot_number INTO _slot
    FROM public.intensive_slots
    WHERE commas_payment_id = _commas_payment_id LIMIT 1;
  IF _slot IS NOT NULL THEN
    UPDATE public.intensive_slots
      SET buyer_email = NULL, commas_payment_id = NULL, claimed_at = NULL,
          booking_status = 'refunded', refunded_at = now()
      WHERE slot_number = _slot;
    UPDATE public.entitlements SET revoked_at = now()
      WHERE source_payment_id = _commas_payment_id
        AND revoked_at IS NULL;
    reversed_product := 'intensive'; released_slot := _slot;
    RETURN NEXT; RETURN;
  END IF;

  reversed_product := NULL; released_slot := NULL;
  RETURN NEXT; RETURN;
END; $function$;
