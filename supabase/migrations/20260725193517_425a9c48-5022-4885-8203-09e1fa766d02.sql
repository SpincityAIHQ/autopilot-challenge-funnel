-- 1) Add evidence columns to marketing_consents (nullable, non-breaking).
ALTER TABLE public.marketing_consents
  ADD COLUMN IF NOT EXISTS signer_name text,
  ADD COLUMN IF NOT EXISTS consent_text text,
  ADD COLUMN IF NOT EXISTS seller text,
  ADD COLUMN IF NOT EXISTS source_route text,
  ADD COLUMN IF NOT EXISTS request_hash text,
  ADD COLUMN IF NOT EXISTS user_agent_hash text;

-- 2) Update reverse_summit_payment to recompute VIP tier from remaining
--    active VIP/vip_upgrade entitlements after a late/duplicate refund.
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
    UPDATE public.entitlements SET revoked_at = now()
      WHERE source_payment_id = _commas_payment_id
        AND revoked_at IS NULL;
    reversed_product := _admission; released_slot := NULL;
    RETURN NEXT; RETURN;
  END IF;

  -- VIP-upgrade reversal.
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
    -- Recompute tier: only downgrade GA-admission back to GA when NO
    -- remaining active vip/vip_upgrade entitlement is tied to this
    -- registration. Prevents a late/duplicate refund of upgrade A from
    -- clobbering an active repurchase B.
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

  -- Vault reversal.
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

  -- Intensive reversal.
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