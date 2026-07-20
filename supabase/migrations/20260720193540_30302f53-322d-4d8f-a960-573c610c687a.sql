
-- Least-privilege lockdown (idempotent) for existing fulfillment functions.
REVOKE ALL ON FUNCTION public.claim_lowest_founder_seat(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_lowest_founder_seat(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_lowest_founder_seat(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lowest_founder_seat(uuid) TO service_role;

-- Safe aggregate remains browser-callable.
REVOKE ALL ON FUNCTION public.founder_seats_remaining() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founder_seats_remaining() TO anon, authenticated, service_role;

-- =====================================================================
-- Atomic fulfillment: one verified Commas payment -> registration (+ seat).
-- Idempotent by commas_payment_id. Founder failure creates no registration.
-- Returns registration id, optional seat, and whether it already existed.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fulfill_challenge_payment(
  _commas_payment_id text,
  _tier              text,
  _bump              boolean,
  _amount_cents      integer,
  _currency          text,
  _full_name         text,
  _email             text,
  _phone             text
)
RETURNS TABLE (
  registration_id uuid,
  seat_number     integer,
  already_existed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_id  uuid;
  _existing_seat integer;
  _new_id       uuid;
  _seat         integer;
BEGIN
  IF _tier NOT IN ('ga','vip','bundle','founder') THEN
    RAISE EXCEPTION 'invalid tier: %', _tier USING ERRCODE = '22023';
  END IF;
  IF _commas_payment_id IS NULL OR length(_commas_payment_id) = 0 THEN
    RAISE EXCEPTION 'commas_payment_id required' USING ERRCODE = '22023';
  END IF;
  IF _amount_cents IS NULL OR _amount_cents < 0 THEN
    RAISE EXCEPTION 'amount_cents must be >= 0' USING ERRCODE = '22023';
  END IF;
  IF _tier <> 'ga' AND _bump THEN
    _bump := false; -- non-GA cannot bump
  END IF;

  -- Idempotency: return existing fulfillment (with seat if founder).
  SELECT r.id
    INTO _existing_id
    FROM public.challenge_registrations r
   WHERE r.commas_payment_id = _commas_payment_id
   LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    SELECT s.seat_number
      INTO _existing_seat
      FROM public.founder_seats s
     WHERE s.registration_id = _existing_id
     LIMIT 1;
    registration_id := _existing_id;
    seat_number     := _existing_seat;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  IF _tier = 'founder' THEN
    -- Claim seat FIRST; if none, raise before any registration row exists.
    SELECT fs.seat_number INTO _seat
      FROM public.founder_seats fs
     WHERE fs.registration_id IS NULL
     ORDER BY fs.seat_number ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED;

    IF _seat IS NULL THEN
      RAISE EXCEPTION 'No founder seats remaining' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.challenge_registrations (
      full_name, email, phone, tier, bump,
      amount_cents, currency, commas_payment_id, status
    ) VALUES (
      _full_name, _email, _phone, _tier, _bump,
      _amount_cents, coalesce(_currency,'USD'), _commas_payment_id, 'confirmed'
    )
    RETURNING id INTO _new_id;

    UPDATE public.founder_seats
       SET registration_id = _new_id, claimed_at = now()
     WHERE seat_number = _seat
       AND registration_id IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Seat claim race lost' USING ERRCODE = 'P0001';
    END IF;

    registration_id := _new_id;
    seat_number     := _seat;
    already_existed := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Non-founder tier: simple confirmed insert.
  INSERT INTO public.challenge_registrations (
    full_name, email, phone, tier, bump,
    amount_cents, currency, commas_payment_id, status
  ) VALUES (
    _full_name, _email, _phone, _tier, _bump,
    _amount_cents, coalesce(_currency,'USD'), _commas_payment_id, 'confirmed'
  )
  RETURNING id INTO _new_id;

  registration_id := _new_id;
  seat_number     := NULL;
  already_existed := false;
  RETURN NEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_challenge_payment(text,text,boolean,integer,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fulfill_challenge_payment(text,text,boolean,integer,text,text,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.fulfill_challenge_payment(text,text,boolean,integer,text,text,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_challenge_payment(text,text,boolean,integer,text,text,text,text) TO service_role;
