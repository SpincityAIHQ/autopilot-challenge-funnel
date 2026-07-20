-- =========================================================
-- AUTOPILOT Challenge Funnel — initial schema
-- =========================================================

-- Shared updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------- challenge_registrations ----------
CREATE TABLE public.challenge_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('ga','vip','bundle','founder')),
  bump BOOLEAN NOT NULL DEFAULT false,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  commas_payment_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','refunded','failed')),
  email_marketing_consent BOOLEAN NOT NULL DEFAULT false,
  email_marketing_consent_at TIMESTAMPTZ,
  sms_marketing_consent BOOLEAN NOT NULL DEFAULT false,
  sms_marketing_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.challenge_registrations TO service_role;
ALTER TABLE public.challenge_registrations ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: browser cannot read or write. Server-only via service_role.

CREATE TRIGGER update_challenge_registrations_updated_at
BEFORE UPDATE ON public.challenge_registrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_challenge_registrations_email ON public.challenge_registrations (email);
CREATE INDEX idx_challenge_registrations_tier ON public.challenge_registrations (tier);

-- ---------- challenge_payment_events ----------
CREATE TABLE public.challenge_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payment_id TEXT,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','processed','ignored','error')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

GRANT ALL ON public.challenge_payment_events TO service_role;
ALTER TABLE public.challenge_payment_events ENABLE ROW LEVEL SECURITY;
-- Server-only.

CREATE INDEX idx_challenge_payment_events_payment_id ON public.challenge_payment_events (payment_id);

-- ---------- founder_seats ----------
CREATE TABLE public.founder_seats (
  seat_number INTEGER PRIMARY KEY CHECK (seat_number BETWEEN 1 AND 33),
  registration_id UUID UNIQUE REFERENCES public.challenge_registrations(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ
);

GRANT ALL ON public.founder_seats TO service_role;
ALTER TABLE public.founder_seats ENABLE ROW LEVEL SECURITY;
-- Server-only.

-- Seed 33 fixed seats
INSERT INTO public.founder_seats (seat_number)
SELECT generate_series(1, 33);

-- ---------- Atomic lowest-open seat claim ----------
CREATE OR REPLACE FUNCTION public.claim_lowest_founder_seat(_registration_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seat INTEGER;
BEGIN
  SELECT seat_number INTO _seat
  FROM public.founder_seats
  WHERE registration_id IS NULL
  ORDER BY seat_number ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF _seat IS NULL THEN
    RAISE EXCEPTION 'No founder seats remaining (hard cap 33 reached)'
      USING ERRCODE = 'P0001';
  END IF;

  IF _seat < 1 OR _seat > 33 THEN
    RAISE EXCEPTION 'Founder seat out of range';
  END IF;

  UPDATE public.founder_seats
  SET registration_id = _registration_id,
      claimed_at = now()
  WHERE seat_number = _seat
    AND registration_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seat claim race lost';
  END IF;

  RETURN _seat;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_lowest_founder_seat(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_lowest_founder_seat(UUID) TO service_role;

-- ---------- Safe aggregate for the browser ----------
CREATE OR REPLACE FUNCTION public.founder_seats_remaining()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.founder_seats
  WHERE registration_id IS NULL;
$$;

REVOKE ALL ON FUNCTION public.founder_seats_remaining() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founder_seats_remaining() TO anon, authenticated, service_role;
