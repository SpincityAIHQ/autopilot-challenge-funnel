
-- 1. Access token revocation
ALTER TABLE public.access_tokens
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

-- 2. Resource session issuance audit
ALTER TABLE public.resource_sessions
  ADD COLUMN IF NOT EXISTS issued_scopes text[] NOT NULL DEFAULT ARRAY[]::text[];

-- 3. Tighten resource_sessions privileges to exact DML only.
REVOKE ALL ON public.resource_sessions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_sessions TO service_role;

-- 4. Immutable admission product on registrations (backfilled from current tier).
ALTER TABLE public.summit_registrations
  ADD COLUMN IF NOT EXISTS admission_product text;
UPDATE public.summit_registrations
  SET admission_product = tier
  WHERE admission_product IS NULL;
ALTER TABLE public.summit_registrations
  ALTER COLUMN admission_product SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'summit_registrations_admission_check'
  ) THEN
    ALTER TABLE public.summit_registrations
      ADD CONSTRAINT summit_registrations_admission_check
      CHECK (admission_product IN ('ga','vip'));
  END IF;
END $$;

-- 5. Replace exchange_access_token: require revoked_at IS NULL + record issued_scopes.
CREATE OR REPLACE FUNCTION public.exchange_access_token(
  _token_hash text, _session_hash text, _ttl_seconds integer
) RETURNS TABLE(buyer_email text, scopes text[], expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email text; _scope text; _exp timestamptz; _scopes text[];
BEGIN
  IF _token_hash IS NULL OR length(_token_hash) < 32 THEN
    RAISE EXCEPTION 'invalid token hash' USING ERRCODE = '22023';
  END IF;
  IF _session_hash IS NULL OR length(_session_hash) < 32 THEN
    RAISE EXCEPTION 'invalid session hash' USING ERRCODE = '22023';
  END IF;
  IF _ttl_seconds IS NULL OR _ttl_seconds < 60 OR _ttl_seconds > 60*60*24*7 THEN
    RAISE EXCEPTION 'invalid ttl' USING ERRCODE = '22023';
  END IF;

  UPDATE public.access_tokens
    SET used_at = now()
    WHERE token_hash = _token_hash
      AND used_at IS NULL
      AND revoked_at IS NULL
      AND expires_at > now()
    RETURNING access_tokens.buyer_email, access_tokens.scope
      INTO _email, _scope;
  IF _email IS NULL THEN
    RAISE EXCEPTION 'token not exchangeable' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.entitlements e
    WHERE e.buyer_email = _email AND e.product = _scope AND e.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'entitlement not active' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT e.product), ARRAY[]::text[])
    INTO _scopes
    FROM public.entitlements e
    WHERE e.buyer_email = _email AND e.revoked_at IS NULL;

  _exp := now() + make_interval(secs => _ttl_seconds);

  INSERT INTO public.resource_sessions
    (session_hash, buyer_email, source_token_hash, expires_at, issued_scopes)
    VALUES (_session_hash, _email, _token_hash, _exp, _scopes);

  buyer_email := _email; scopes := _scopes; expires_at := _exp;
  RETURN NEXT;
END; $$;
REVOKE EXECUTE ON FUNCTION public.exchange_access_token(text,text,integer) FROM PUBLIC, anon, authenticated;

-- 6. Replace fulfill_summit_payment so entitlement inserts reactivate on repurchase.
CREATE OR REPLACE FUNCTION public.fulfill_summit_payment(
  _product text, _commas_payment_id text, _amount_cents integer, _currency text,
  _full_name text, _email text, _phone text,
  _first_touch jsonb, _last_touch jsonb
) RETURNS TABLE(registration_id uuid, slot_number integer, already_existed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    INSERT INTO public.entitlements (registration_id, buyer_email, product)
      VALUES (_new_id, _email, _product)
      ON CONFLICT (buyer_email, product) DO UPDATE
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
    INSERT INTO public.entitlements (registration_id, buyer_email, product)
      VALUES (_ga_reg, _email, 'vip')
      ON CONFLICT (buyer_email, product) DO UPDATE
        SET registration_id = excluded.registration_id, granted_at = now(), revoked_at = NULL;
    INSERT INTO public.entitlements (registration_id, buyer_email, product)
      VALUES (_ga_reg, _email, 'vip_upgrade')
      ON CONFLICT (buyer_email, product) DO UPDATE
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
    INSERT INTO public.entitlements (registration_id, buyer_email, product)
      VALUES (_existing_id, _email, 'vault')
      ON CONFLICT (buyer_email, product) DO UPDATE
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
    INSERT INTO public.entitlements (registration_id, buyer_email, product)
      VALUES (NULL, _email, 'intensive')
      ON CONFLICT (buyer_email, product) DO UPDATE
        SET registration_id = excluded.registration_id, granted_at = now(), revoked_at = NULL;
    registration_id := NULL; slot_number := _slot; already_existed := false;
    RETURN NEXT; RETURN;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.fulfill_summit_payment(text,text,integer,text,text,text,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;

-- 7. Replace reverse_summit_payment — only revoke entitlements tied to the refunded product.
CREATE OR REPLACE FUNCTION public.reverse_summit_payment(_commas_payment_id text)
RETURNS TABLE(reversed_product text, released_slot integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _reg_id uuid; _admission text; _slot integer; _email text;
BEGIN
  IF _commas_payment_id IS NULL OR length(_commas_payment_id) = 0 THEN
    RAISE EXCEPTION 'commas_payment_id required' USING ERRCODE = '22023';
  END IF;

  -- Admission reversal (GA or direct VIP).
  SELECT id, admission_product, email INTO _reg_id, _admission, _email
    FROM public.summit_registrations
    WHERE commas_payment_id = _commas_payment_id LIMIT 1;
  IF _reg_id IS NOT NULL THEN
    UPDATE public.summit_registrations
      SET payment_status = 'refunded', refunded_at = now(), status = 'refunded'
      WHERE id = _reg_id;
    -- Revoke only entitlements attached to THIS admission registration.
    -- GA admission: revokes ga + any vip/vip_upgrade added on this same registration.
    -- Direct VIP admission: revokes only vip on this registration.
    -- Vault entitlement (registration_id may be a different admission) untouched.
    IF _admission = 'ga' THEN
      UPDATE public.entitlements SET revoked_at = now()
        WHERE registration_id = _reg_id
          AND product IN ('ga','vip','vip_upgrade')
          AND revoked_at IS NULL;
    ELSE
      UPDATE public.entitlements SET revoked_at = now()
        WHERE registration_id = _reg_id
          AND product = 'vip'
          AND revoked_at IS NULL;
    END IF;
    reversed_product := _admission; released_slot := NULL;
    RETURN NEXT; RETURN;
  END IF;

  -- VIP upgrade reversal — restore GA, revoke only vip + vip_upgrade on that registration.
  SELECT registration_id, buyer_email INTO _reg_id, _email
    FROM public.summit_vip_upgrades
    WHERE commas_payment_id = _commas_payment_id LIMIT 1;
  IF _reg_id IS NOT NULL THEN
    UPDATE public.summit_vip_upgrades
      SET payment_status = 'refunded', refunded_at = now()
      WHERE commas_payment_id = _commas_payment_id;
    UPDATE public.summit_registrations SET tier = 'ga' WHERE id = _reg_id AND admission_product = 'ga';
    UPDATE public.entitlements SET revoked_at = now()
      WHERE registration_id = _reg_id
        AND product IN ('vip','vip_upgrade')
        AND revoked_at IS NULL;
    reversed_product := 'vip_upgrade'; released_slot := NULL;
    RETURN NEXT; RETURN;
  END IF;

  -- Vault reversal — revoke only vault.
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

  -- Intensive reversal — release slot, revoke only intensive.
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
END; $$;
REVOKE EXECUTE ON FUNCTION public.reverse_summit_payment(text) FROM PUBLIC, anon, authenticated;

-- 8. Keep session_active_scopes locked to service_role.
REVOKE EXECUTE ON FUNCTION public.session_active_scopes(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.entitlement_by_token_hash(text) FROM PUBLIC, anon, authenticated;
