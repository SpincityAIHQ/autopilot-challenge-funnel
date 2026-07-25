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
    IF EXISTS (SELECT 1 FROM public.summit_vip_upgrades u WHERE u.commas_payment_id = _commas_payment_id) THEN
      SELECT u.registration_id INTO _existing_id FROM public.summit_vip_upgrades u
        WHERE u.commas_payment_id = _commas_payment_id LIMIT 1;
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
    IF EXISTS (SELECT 1 FROM public.summit_vault_purchases v WHERE v.commas_payment_id = _commas_payment_id) THEN
      SELECT v.registration_id INTO _existing_id FROM public.summit_vault_purchases v
        WHERE v.commas_payment_id = _commas_payment_id LIMIT 1;
      registration_id := _existing_id; slot_number := NULL; already_existed := true;
      RETURN NEXT; RETURN;
    END IF;
    -- Sequential funnel precondition: Vault requires an active VIP or
    -- VIP-upgrade entitlement (GA alone is insufficient).
    IF NOT EXISTS (
      SELECT 1 FROM public.entitlements e
      WHERE lower(e.buyer_email) = lower(_email)
        AND e.product IN ('vip','vip_upgrade')
        AND e.revoked_at IS NULL
    ) THEN
      RAISE EXCEPTION 'vault requires an active VIP entitlement' USING ERRCODE = 'P0002';
    END IF;
    SELECT r.id INTO _existing_id
      FROM public.summit_registrations r
      WHERE lower(r.email) = lower(_email) AND r.payment_status = 'confirmed'
      ORDER BY r.created_at DESC LIMIT 1;
    IF _existing_id IS NULL THEN
      RAISE EXCEPTION 'vault requires an active Summit registration' USING ERRCODE = 'P0002';
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
    IF EXISTS (SELECT 1 FROM public.intensive_slots s WHERE s.commas_payment_id = _commas_payment_id) THEN
      SELECT s.slot_number INTO _existing_slot FROM public.intensive_slots s
        WHERE s.commas_payment_id = _commas_payment_id LIMIT 1;
      registration_id := NULL; slot_number := _existing_slot; already_existed := true;
      RETURN NEXT; RETURN;
    END IF;
    -- Sequential funnel precondition: Intensive requires an active Vault
    -- entitlement OR an explicit operator-created eligibility row.
    IF NOT EXISTS (
      SELECT 1 FROM public.entitlements e
        WHERE lower(e.buyer_email) = lower(_email)
          AND e.product = 'vault'
          AND e.revoked_at IS NULL
      UNION ALL
      SELECT 1 FROM public.intensive_eligibility e
        WHERE lower(e.buyer_email) = lower(_email)
    ) THEN
      RAISE EXCEPTION 'intensive requires an active Vault entitlement or operator-approved eligibility' USING ERRCODE = 'P0002';
    END IF;
    SELECT s.slot_number INTO _slot FROM public.intensive_slots s
      WHERE s.claimed_at IS NULL
      ORDER BY s.slot_number ASC LIMIT 1
      FOR UPDATE SKIP LOCKED;
    IF _slot IS NULL THEN
      RAISE EXCEPTION 'No intensive slots remaining' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.intensive_slots s
      SET buyer_email = _email, commas_payment_id = _commas_payment_id,
          claimed_at = now(), booking_status = 'confirmed',
          amount_cents = _amount_cents, currency = coalesce(_currency,'USD')
      WHERE s.slot_number = _slot AND s.claimed_at IS NULL;
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