-- One-click post-purchase charge audit and duplicate protection.
--
-- The browser never receives customer IDs or payment-method IDs. A verified
-- HttpOnly Summit session is required before the server may reserve an attempt.
-- Pending, unknown, and succeeded attempts block another charge for the same
-- buyer/product so a timeout cannot silently become a double charge.

CREATE TABLE public.one_click_charge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_email TEXT NOT NULL,
  product TEXT NOT NULL CHECK (product IN ('vip_upgrade', 'vault', 'intensive')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'unknown')),
  provider_charge_id TEXT,
  card_last4 TEXT CHECK (card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$'),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX one_click_charge_active_buyer_product
  ON public.one_click_charge_attempts (lower(buyer_email), product)
  WHERE status IN ('pending', 'succeeded', 'unknown');

CREATE UNIQUE INDEX one_click_charge_provider_id
  ON public.one_click_charge_attempts (provider_charge_id)
  WHERE provider_charge_id IS NOT NULL;

ALTER TABLE public.one_click_charge_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.one_click_charge_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.one_click_charge_attempts TO service_role;

CREATE TRIGGER update_one_click_charge_attempts_updated_at
BEFORE UPDATE ON public.one_click_charge_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.reserve_one_click_charge(
  _buyer_email TEXT,
  _product TEXT,
  _amount_cents INTEGER,
  _idempotency_key TEXT,
  _card_last4 TEXT
)
RETURNS TABLE(attempt_id UUID, reserved BOOLEAN, current_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing public.one_click_charge_attempts%ROWTYPE;
  _new_id UUID;
BEGIN
  IF _product NOT IN ('vip_upgrade', 'vault', 'intensive') THEN
    RAISE EXCEPTION 'unsupported one-click product';
  END IF;
  IF _amount_cents <= 0 THEN
    RAISE EXCEPTION 'invalid one-click amount';
  END IF;

  SELECT * INTO _existing
  FROM public.one_click_charge_attempts
  WHERE lower(buyer_email) = lower(trim(_buyer_email))
    AND product = _product
    AND status IN ('pending', 'succeeded', 'unknown')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN QUERY SELECT _existing.id, false, _existing.status;
    RETURN;
  END IF;

  INSERT INTO public.one_click_charge_attempts (
    buyer_email,
    product,
    amount_cents,
    idempotency_key,
    card_last4,
    status
  ) VALUES (
    lower(trim(_buyer_email)),
    _product,
    _amount_cents,
    _idempotency_key,
    _card_last4,
    'pending'
  )
  RETURNING id INTO _new_id;

  RETURN QUERY SELECT _new_id, true, 'pending'::TEXT;
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO _existing
    FROM public.one_click_charge_attempts
    WHERE lower(buyer_email) = lower(trim(_buyer_email))
      AND product = _product
      AND status IN ('pending', 'succeeded', 'unknown')
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY SELECT _existing.id, false, _existing.status;
      RETURN;
    END IF;
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_one_click_charge(
  _attempt_id UUID,
  _status TEXT,
  _provider_charge_id TEXT DEFAULT NULL,
  _error_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _status NOT IN ('succeeded', 'failed', 'unknown') THEN
    RAISE EXCEPTION 'invalid one-click terminal status';
  END IF;

  UPDATE public.one_click_charge_attempts
  SET status = _status,
      provider_charge_id = NULLIF(_provider_charge_id, ''),
      error_code = NULLIF(_error_code, ''),
      updated_at = now()
  WHERE id = _attempt_id
    AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_one_click_charge(TEXT, TEXT, INTEGER, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_one_click_charge(UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_one_click_charge(TEXT, TEXT, INTEGER, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_one_click_charge(UUID, TEXT, TEXT, TEXT)
  TO service_role;
