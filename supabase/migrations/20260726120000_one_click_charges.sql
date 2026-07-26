-- ============================================================
-- Saved-card one-click upgrades: atomic duplicate-charge guard.
--
-- The browser can be clicked twice, refreshed mid-request, or replayed. The
-- ONLY thing standing between that and a double charge is a row that must be
-- claimed before the money moves. `begin_one_click_charge` performs that claim
-- inside the database, so two concurrent clicks cannot both proceed.
--
-- Limited by CHECK constraint to the $77 VIP upgrade and the $199 Vault.
-- The $1,000 Intensive is intentionally NOT one-clickable — it holds real seat
-- inventory and carries materially higher dispute risk, so it always goes
-- through a full Commas checkout.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.one_click_charges (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_email       text NOT NULL,
  product           text NOT NULL CHECK (product IN ('vip_upgrade','vault')),
  amount_cents      integer NOT NULL CHECK (amount_cents > 0),
  currency          text NOT NULL DEFAULT 'USD',
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','succeeded','failed','unknown')),
  commas_payment_id text,
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  settled_at        timestamptz
);

-- The duplicate-charge guard.
--
-- At most one attempt per (buyer, product) may sit in a state where the money
-- may already have moved. 'pending' (in flight), 'succeeded' (it moved), and
-- 'unknown' (we cannot tell) all block a second attempt. Only 'failed' — an
-- explicit decline from Commas — leaves the index so the buyer can genuinely
-- try again with the same card.
CREATE UNIQUE INDEX IF NOT EXISTS one_click_charges_active_idx
  ON public.one_click_charges (lower(buyer_email), product)
  WHERE status IN ('pending','succeeded','unknown');

CREATE INDEX IF NOT EXISTS one_click_charges_payment_idx
  ON public.one_click_charges (commas_payment_id)
  WHERE commas_payment_id IS NOT NULL;

REVOKE ALL ON TABLE public.one_click_charges FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.one_click_charges TO service_role;
ALTER TABLE public.one_click_charges ENABLE ROW LEVEL SECURITY;
-- No policies: service_role bypasses RLS; no other role gets access.

-- ------------------------------------------------------------
-- Claim the right to charge. Returns the claimed row, or the status of the
-- attempt that is already blocking, so the caller can tell the buyer exactly
-- what happened without ever charging twice.
--
-- Entitlement preconditions are re-checked HERE as well as in the API route.
-- The route's check is a UX affordance; this one is the security boundary.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.begin_one_click_charge(
  _buyer_email  text,
  _product      text,
  _amount_cents integer,
  _currency     text
) RETURNS TABLE(charge_id uuid, blocked_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _existing_id     uuid;
  _existing_status text;
  _new_id          uuid;
BEGIN
  IF _product NOT IN ('vip_upgrade','vault') THEN
    RAISE EXCEPTION 'one-click is not available for product %', _product
      USING ERRCODE = '22023';
  END IF;
  IF _buyer_email IS NULL OR length(_buyer_email) = 0 THEN
    RAISE EXCEPTION 'buyer_email required' USING ERRCODE = '22023';
  END IF;
  IF _amount_cents IS NULL OR _amount_cents <= 0 THEN
    RAISE EXCEPTION 'amount_cents must be > 0' USING ERRCODE = '22023';
  END IF;

  -- Sequential-funnel preconditions. Mirrors fulfill_summit_payment so a
  -- one-click charge can never grant something out of order.
  IF _product = 'vip_upgrade' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.entitlements e
       WHERE lower(e.buyer_email) = lower(_buyer_email)
         AND e.product = 'ga'
         AND e.revoked_at IS NULL
    ) THEN
      RAISE EXCEPTION 'vip_upgrade requires an active GA entitlement'
        USING ERRCODE = 'P0002';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.entitlements e
       WHERE lower(e.buyer_email) = lower(_buyer_email)
         AND e.product IN ('vip','vip_upgrade')
         AND e.revoked_at IS NULL
    ) THEN
      RAISE EXCEPTION 'vip already owned' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.entitlements e
       WHERE lower(e.buyer_email) = lower(_buyer_email)
         AND e.product IN ('vip','vip_upgrade')
         AND e.revoked_at IS NULL
    ) THEN
      RAISE EXCEPTION 'vault requires an active VIP entitlement'
        USING ERRCODE = 'P0002';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.entitlements e
       WHERE lower(e.buyer_email) = lower(_buyer_email)
         AND e.product = 'vault'
         AND e.revoked_at IS NULL
    ) THEN
      RAISE EXCEPTION 'vault already owned' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  SELECT c.id, c.status INTO _existing_id, _existing_status
    FROM public.one_click_charges c
   WHERE lower(c.buyer_email) = lower(_buyer_email)
     AND c.product = _product
     AND c.status IN ('pending','succeeded','unknown')
   LIMIT 1
   FOR UPDATE;

  IF _existing_id IS NOT NULL THEN
    charge_id := _existing_id;
    blocked_status := _existing_status;
    RETURN NEXT; RETURN;
  END IF;

  -- The unique partial index is the real guard: if a concurrent request won
  -- the race between the SELECT above and this INSERT, the insert raises and
  -- we report the winner instead of charging a second time.
  BEGIN
    INSERT INTO public.one_click_charges
      (buyer_email, product, amount_cents, currency, status)
      VALUES (_buyer_email, _product, _amount_cents, coalesce(_currency,'USD'), 'pending')
      RETURNING id INTO _new_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT c.id, c.status INTO _existing_id, _existing_status
      FROM public.one_click_charges c
     WHERE lower(c.buyer_email) = lower(_buyer_email)
       AND c.product = _product
       AND c.status IN ('pending','succeeded','unknown')
     LIMIT 1;
    charge_id := _existing_id;
    blocked_status := coalesce(_existing_status, 'pending');
    RETURN NEXT; RETURN;
  END;

  charge_id := _new_id;
  blocked_status := NULL;
  RETURN NEXT; RETURN;
END; $$;

REVOKE ALL ON FUNCTION public.begin_one_click_charge(text, text, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_one_click_charge(text, text, integer, text)
  TO service_role;

-- ------------------------------------------------------------
-- Record the terminal state of a claimed attempt.
--
-- 'failed' releases the guard so the buyer may retry. 'succeeded' and
-- 'unknown' both keep it held: after either one, another automatic attempt
-- could take the money a second time.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_one_click_charge(
  _charge_id         uuid,
  _status            text,
  _commas_payment_id text,
  _error             text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _status NOT IN ('succeeded','failed','unknown') THEN
    RAISE EXCEPTION 'invalid terminal status %', _status USING ERRCODE = '22023';
  END IF;

  UPDATE public.one_click_charges
     SET status = _status,
         commas_payment_id = coalesce(_commas_payment_id, commas_payment_id),
         error = _error,
         settled_at = now()
   WHERE id = _charge_id
     AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'one-click charge % is not pending', _charge_id
      USING ERRCODE = 'P0002';
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.complete_one_click_charge(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_one_click_charge(uuid, text, text, text)
  TO service_role;

-- ------------------------------------------------------------
-- Read-side helper for the availability GET. Returns whether a blocking
-- attempt exists so the button can be disabled before the buyer clicks.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.one_click_charge_state(
  _buyer_email text,
  _product     text
) RETURNS TABLE(status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.status
    FROM public.one_click_charges c
   WHERE lower(c.buyer_email) = lower(_buyer_email)
     AND c.product = _product
     AND c.status IN ('pending','succeeded','unknown')
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.one_click_charge_state(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.one_click_charge_state(text, text)
  TO service_role;
