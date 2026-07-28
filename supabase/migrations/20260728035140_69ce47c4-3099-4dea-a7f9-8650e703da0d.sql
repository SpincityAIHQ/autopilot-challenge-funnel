
CREATE OR REPLACE FUNCTION public.fulfill_summit_bundle(
  _scopes text[],
  _commas_payment_id text,
  _amount_cents integer,
  _currency text,
  _full_name text,
  _email text,
  _phone text,
  _first_touch jsonb,
  _last_touch jsonb
) RETURNS TABLE(registration_id uuid, already_existed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _existing uuid;
  _new uuid;
  _scope text;
  _tier text;
  _admission text;
BEGIN
  IF _scopes IS NULL OR array_length(_scopes, 1) IS NULL THEN
    RAISE EXCEPTION 'scopes required' USING ERRCODE = '22023';
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

  FOREACH _scope IN ARRAY _scopes LOOP
    IF _scope NOT IN ('ga','vip','vault') THEN
      RAISE EXCEPTION 'invalid bundle scope: %', _scope USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF NOT ('ga' = ANY(_scopes)) THEN
    RAISE EXCEPTION 'bundle must include ga admission' USING ERRCODE = '22023';
  END IF;

  -- Idempotency by payment id.
  SELECT id INTO _existing
    FROM public.summit_registrations
    WHERE commas_payment_id = _commas_payment_id
    LIMIT 1;
  IF _existing IS NOT NULL THEN
    registration_id := _existing;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  _tier := CASE WHEN 'vip' = ANY(_scopes) THEN 'vip' ELSE 'ga' END;
  _admission := _tier;

  INSERT INTO public.summit_registrations
    (full_name, email, phone, tier, admission_product, amount_cents, currency,
     commas_payment_id, status, payment_status, first_touch, last_touch)
    VALUES (_full_name, _email, _phone, _tier, _admission, _amount_cents,
            coalesce(_currency, 'USD'), _commas_payment_id,
            'confirmed', 'confirmed', _first_touch, _last_touch)
    RETURNING id INTO _new;

  FOREACH _scope IN ARRAY _scopes LOOP
    INSERT INTO public.entitlements
      (registration_id, buyer_email, product, source_payment_id)
      VALUES (_new, _email, _scope, _commas_payment_id)
      ON CONFLICT (source_payment_id, product) DO UPDATE
        SET registration_id = excluded.registration_id,
            granted_at = now(),
            revoked_at = NULL;
  END LOOP;

  IF 'vault' = ANY(_scopes) THEN
    INSERT INTO public.summit_vault_purchases
      (registration_id, buyer_email, amount_cents, currency,
       commas_payment_id, payment_status)
      VALUES (_new, _email, _amount_cents, coalesce(_currency, 'USD'),
              _commas_payment_id, 'confirmed');
  END IF;

  registration_id := _new;
  already_existed := false;
  RETURN NEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_summit_bundle(text[], text, integer, text, text, text, text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fulfill_summit_bundle(text[], text, integer, text, text, text, text, jsonb, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.fulfill_summit_bundle(text[], text, integer, text, text, text, text, jsonb, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_summit_bundle(text[], text, integer, text, text, text, text, jsonb, jsonb) TO service_role;

-- Extend reverse_summit_payment so a bundle-registration refund also flags
-- its side-table summit_vault_purchases row (if any) as refunded. The
-- entitlement-level revoke already happens by source_payment_id.
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

  SELECT id, admission_product INTO _reg_id, _admission
    FROM public.summit_registrations
    WHERE commas_payment_id = _commas_payment_id LIMIT 1;
  IF _reg_id IS NOT NULL THEN
    UPDATE public.summit_registrations
      SET payment_status = 'refunded', refunded_at = now(), status = 'refunded'
      WHERE id = _reg_id;
    UPDATE public.entitlements SET revoked_at = now()
      WHERE source_payment_id = _commas_payment_id
        AND revoked_at IS NULL;
    -- Bundle side-table cleanup: same commas_payment_id may back a vault row.
    UPDATE public.summit_vault_purchases
      SET payment_status = 'refunded', refunded_at = now(), status = 'refunded'
      WHERE commas_payment_id = _commas_payment_id
        AND payment_status <> 'refunded';
    reversed_product := _admission; released_slot := NULL;
    RETURN NEXT; RETURN;
  END IF;

  SELECT registration_id INTO _reg_id
    FROM public.summit_vip_upgrades
    WHERE commas_payment_id = _commas_payment_id LIMIT 1;
  IF _reg_id IS NOT NULL THEN
    UPDATE public.summit_vip_upgrades
      SET payment_status = 'refunded', refunded_at = now()
      WHERE commas_payment_id = _commas_payment_id;
    UPDATE public.entitlements SET revoked_at = now()
      WHERE source_payment_id = _commas_payment_id
        AND revoked_at IS NULL;
    IF NOT EXISTS (
      SELECT 1 FROM public.entitlements e
      WHERE e.registration_id = _reg_id
        AND e.product IN ('vip','vip_upgrade')
        AND e.revoked_at IS NULL
    ) THEN
      UPDATE public.summit_registrations SET tier = 'ga'
        WHERE id = _reg_id AND admission_product = 'ga';
    END IF;
    reversed_product := 'vip_upgrade'; released_slot := NULL;
    RETURN NEXT; RETURN;
  END IF;

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

REVOKE ALL ON FUNCTION public.reverse_summit_payment(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_summit_payment(text) FROM anon;
REVOKE ALL ON FUNCTION public.reverse_summit_payment(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_summit_payment(text) TO service_role;
