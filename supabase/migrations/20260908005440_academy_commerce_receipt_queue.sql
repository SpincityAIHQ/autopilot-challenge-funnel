BEGIN;

ALTER TABLE public.academy_commerce_receipts
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

CREATE INDEX IF NOT EXISTS academy_commerce_receipts_queue
  ON public.academy_commerce_receipts(status, due_at, received_at);

CREATE OR REPLACE FUNCTION public.academy_claim_commerce_receipts(p_limit integer)
RETURNS SETOF public.academy_commerce_receipts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Admin reconciliation is read/idempotent, so an expired processing lease is
  -- safe to retry. Unlike an uncertain outbound email, it cannot double-send.
  WITH expired AS (
    SELECT event_id
    FROM public.academy_commerce_receipts
    WHERE status = 'processing'
      AND locked_at < now() - interval '10 minutes'
    ORDER BY locked_at
    FOR UPDATE SKIP LOCKED
    LIMIT 20
  )
  UPDATE public.academy_commerce_receipts AS receipt
  SET status = CASE WHEN receipt.attempts >= 5 THEN 'failed' ELSE 'retry' END,
      due_at = CASE WHEN receipt.attempts >= 5 THEN receipt.due_at ELSE now() END,
      locked_at = NULL,
      processed_at = CASE WHEN receipt.attempts >= 5 THEN now() ELSE NULL END,
      last_error = 'processing_lease_expired'
  WHERE receipt.event_id IN (SELECT event_id FROM expired);

  -- Claim at most one receipt per order in a batch. A noisy order with many
  -- duplicate webhook events cannot starve a later purchase or revocation.
  RETURN QUERY
  WITH candidates AS MATERIALIZED (
    SELECT DISTINCT ON (order_id)
      event_id, order_id, due_at, received_at
    FROM public.academy_commerce_receipts
    WHERE status IN ('pending', 'retry')
      AND due_at <= now()
      AND attempts < 5
    ORDER BY order_id, due_at, received_at
  ), claimable AS (
    SELECT receipt.event_id
    FROM public.academy_commerce_receipts AS receipt
    JOIN candidates USING(event_id)
    ORDER BY candidates.due_at, candidates.received_at
    FOR UPDATE OF receipt SKIP LOCKED
    LIMIT least(greatest(p_limit, 1), 20)
  )
  UPDATE public.academy_commerce_receipts
  SET status = 'processing',
      locked_at = now(),
      attempts = attempts + 1,
      last_error = NULL
  WHERE event_id IN (SELECT event_id FROM claimable)
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.academy_claim_commerce_receipts(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_claim_commerce_receipts(integer)
  TO service_role;

ALTER TABLE public.academy_access_deliveries
  DROP CONSTRAINT IF EXISTS academy_access_deliveries_status_check;
ALTER TABLE public.academy_access_deliveries
  ADD CONSTRAINT academy_access_deliveries_status_check
  CHECK(status IN ('pending', 'processing', 'accepted', 'unknown', 'cancelled', 'failed', 'retry'));

CREATE INDEX IF NOT EXISTS academy_access_delivery_queue
  ON public.academy_access_deliveries(status, due_at, created_at);

CREATE OR REPLACE FUNCTION public.academy_claim_access_deliveries(p_limit integer)
RETURNS SETOF public.academy_access_deliveries
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- A lost worker may have sent the code before disconnecting. Quarantine that
  -- lease for operator reconciliation; never turn ambiguity into a duplicate.
  WITH expired AS (
    SELECT id
    FROM public.academy_access_deliveries
    WHERE status = 'processing'
      AND locked_at < now() - interval '10 minutes'
    ORDER BY locked_at
    FOR UPDATE SKIP LOCKED
    LIMIT 20
  )
  UPDATE public.academy_access_deliveries AS delivery
  SET status = 'unknown', completed_at = now()
  WHERE delivery.id IN (SELECT id FROM expired);

  RETURN QUERY
  UPDATE public.academy_access_deliveries
  SET status = 'processing', locked_at = now(), attempts = attempts + 1
  WHERE id IN (
    SELECT id
    FROM public.academy_access_deliveries
    WHERE status IN ('pending', 'retry')
      AND due_at <= now()
      AND attempts < 5
    ORDER BY due_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT least(greatest(p_limit, 1), 20)
  )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.academy_claim_access_deliveries(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_claim_access_deliveries(integer)
  TO service_role;

COMMIT;
