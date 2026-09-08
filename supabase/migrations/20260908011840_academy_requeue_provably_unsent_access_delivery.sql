BEGIN;

-- The worker persists this marker whenever an outbound request is attempted;
-- an expired processing lease is also quarantined as UNKNOWN by the claim RPC.
-- Conservatively mark every pre-migration non-pending row because its historical
-- send state cannot be proven; only future failed rows with NULL are recoverable.
ALTER TABLE public.academy_access_deliveries
  ADD COLUMN IF NOT EXISTS send_attempted_at timestamptz;

UPDATE public.academy_access_deliveries
SET send_attempted_at = coalesce(completed_at, locked_at, created_at)
WHERE status <> 'pending'
  AND send_attempted_at IS NULL;

-- A pre-migration retry/lease may already have crossed the outbound boundary.
-- Quarantine it for provider reconciliation instead of letting the queue claim
-- it automatically under the new marker semantics.
UPDATE public.academy_access_deliveries
SET status = 'unknown',
    locked_at = NULL,
    completed_at = coalesce(completed_at, now())
WHERE status IN ('retry', 'processing');

CREATE OR REPLACE FUNCTION public.academy_guard_access_delivery_outcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.send_attempted_at IS NOT NULL
    AND NEW.send_attempted_at IS DISTINCT FROM OLD.send_attempted_at
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'ACCESS_DELIVERY_ATTEMPT_MARKER_IS_IMMUTABLE';
  END IF;

  IF NEW.status IN ('accepted', 'unknown') THEN
    NEW.send_attempted_at := coalesce(NEW.send_attempted_at, now());
  END IF;

  -- service_role is trusted database authority. This transaction-local marker
  -- coordinates the two reviewed RPCs with the trigger and prevents accidental
  -- or blind application updates from moving terminal rows back to the queue.
  IF TG_OP = 'UPDATE'
    AND OLD.status IN ('accepted', 'cancelled')
    AND NEW.status IS DISTINCT FROM OLD.status
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'FINAL_ACCESS_DELIVERY_OUTCOME_IS_IMMUTABLE';
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.status IN ('accepted', 'unknown', 'cancelled', 'failed')
    AND NEW.status IN ('pending', 'processing', 'retry')
    AND coalesce(
      pg_catalog.current_setting('academy.reviewed_access_delivery_recovery_id', true),
      ''
    ) <> OLD.id::text
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TERMINAL_ACCESS_DELIVERY_CANNOT_BE_REQUEUED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_access_delivery_outcome_guard
  ON public.academy_access_deliveries;
CREATE TRIGGER academy_access_delivery_outcome_guard
BEFORE INSERT OR UPDATE OF status, send_attempted_at
ON public.academy_access_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.academy_guard_access_delivery_outcome();

ALTER TABLE public.academy_access_deliveries
  DROP CONSTRAINT IF EXISTS academy_access_delivery_attempted_outcome_check,
  DROP CONSTRAINT IF EXISTS academy_access_delivery_queue_unsent_check;
ALTER TABLE public.academy_access_deliveries
  ADD CONSTRAINT academy_access_delivery_attempted_outcome_check
    CHECK(status NOT IN ('accepted', 'unknown') OR send_attempted_at IS NOT NULL);

CREATE OR REPLACE FUNCTION public.academy_requeue_failed_access_delivery(
  p_delivery uuid,
  p_reviewer uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  delivery_hint public.academy_access_deliveries;
  code_hint public.academy_access_codes;
  delivery public.academy_access_deliveries;
  code public.academy_access_codes;
  grant_row public.academy_grants;
  order_row public.academy_orders;
  audit_id uuid;
  changed integer;
BEGIN
  IF p_delivery IS NULL OR p_reviewer IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'DELIVERY_AND_REVIEWER_ARE_REQUIRED';
  END IF;

  -- Read stable identifiers first, then acquire locks in the same order used by
  -- code issuance and order reconciliation: order, grant, code, delivery.
  SELECT * INTO delivery_hint
  FROM public.academy_access_deliveries
  WHERE id = p_delivery;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCESS_DELIVERY_NOT_FOUND';
  END IF;

  SELECT * INTO code_hint
  FROM public.academy_access_codes
  WHERE id = delivery_hint.code_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCESS_CODE_NOT_FOUND';
  END IF;

  SELECT * INTO order_row
  FROM public.academy_orders
  WHERE order_id = code_hint.order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACADEMY_ORDER_NOT_FOUND';
  END IF;

  SELECT * INTO grant_row
  FROM public.academy_grants
  WHERE order_id = code_hint.order_id
    AND line_id = code_hint.line_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACADEMY_GRANT_NOT_FOUND';
  END IF;

  SELECT * INTO code
  FROM public.academy_access_codes
  WHERE id = code_hint.id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCESS_CODE_NOT_FOUND';
  END IF;

  SELECT * INTO delivery
  FROM public.academy_access_deliveries
  WHERE id = p_delivery
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCESS_DELIVERY_NOT_FOUND';
  END IF;

  -- Only a terminal pre-send failure is recoverable. An accepted or uncertain
  -- outcome fails this test and remains permanently outside the send queue.
  IF delivery.status IS DISTINCT FROM 'failed'
    OR delivery.send_attempted_at IS NOT NULL
    OR delivery.completed_at IS NULL
    OR delivery.attempts < 5
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'ACCESS_DELIVERY_NOT_PROVABLY_UNSENT';
  END IF;

  IF delivery.code_id IS DISTINCT FROM code.id
    OR delivery.generation IS DISTINCT FROM code.generation
    OR code.order_id IS DISTINCT FROM code_hint.order_id
    OR code.line_id IS DISTINCT FROM code_hint.line_id
    OR order_row.order_id IS DISTINCT FROM code.order_id
    OR grant_row.order_id IS DISTINCT FROM code.order_id
    OR grant_row.line_id IS DISTINCT FROM code.line_id
    OR code.redeemed_by IS NOT NULL
    OR code.redeemed_at IS NOT NULL
    OR code.access_until IS NOT NULL
    OR code.expires_at <= now()
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'ACCESS_CODE_IS_NOT_CURRENT_AND_REDEEMABLE';
  END IF;

  IF NOT grant_row.active
    OR grant_row.quantity <> 1
    OR grant_row.email IS DISTINCT FROM code.email
    OR grant_row.tier IS DISTINCT FROM code.tier
    OR order_row.needs_review
    OR order_row.email IS DISTINCT FROM code.email
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'PURCHASE_IS_NOT_ELIGIBLE_FOR_ACCESS_DELIVERY';
  END IF;

  PERFORM pg_catalog.set_config(
    'academy.reviewed_access_delivery_recovery_id',
    delivery.id::text,
    true
  );

  UPDATE public.academy_access_deliveries
  SET status = 'pending',
      due_at = now(),
      attempts = 0,
      locked_at = NULL,
      completed_at = NULL
  WHERE id = delivery.id
    AND status = 'failed'
    AND send_attempted_at IS NULL
    AND generation = code.generation;
  GET DIAGNOSTICS changed = ROW_COUNT;

  PERFORM pg_catalog.set_config('academy.reviewed_access_delivery_recovery_id', '', true);

  IF changed <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'ACCESS_DELIVERY_CHANGED_DURING_REVIEW';
  END IF;

  INSERT INTO public.academy_events(user_id, name, payload)
  VALUES (
    p_reviewer,
    'access_delivery_requeued_by_operator',
    jsonb_build_object(
      'reviewerId', p_reviewer,
      'deliveryId', delivery.id,
      'eventId', delivery.id,
      'orderId', code.order_id,
      'lineId', code.line_id,
      'codeId', code.id,
      'generation', code.generation,
      'priorStatus', delivery.status,
      'priorAttempts', delivery.attempts,
      'priorLockedAt', delivery.locked_at,
      'priorCompletedAt', delivery.completed_at,
      'priorSendAttemptedAt', delivery.send_attempted_at,
      'evidence', 'failed_with_no_send_attempt_marker'
    )
  )
  RETURNING id INTO audit_id;

  RETURN jsonb_build_object(
    'requeued', true,
    'deliveryId', delivery.id,
    'eventId', delivery.id,
    'orderId', code.order_id,
    'codeId', code.id,
    'reviewerId', p_reviewer,
    'auditEventId', audit_id
  );
END;
$$;

COMMENT ON FUNCTION public.academy_requeue_failed_access_delivery(uuid, uuid) IS
  'Operator-reviewed recovery for a failed access email proven not to have reached the outbound send attempt. Preserves the delivery/GHL idempotency event ID and writes an academy_events audit record.';

CREATE OR REPLACE FUNCTION public.academy_requeue_reconciled_unknown_access_delivery(
  p_delivery uuid,
  p_reviewer uuid,
  p_evidence text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  delivery_hint public.academy_access_deliveries;
  code_hint public.academy_access_codes;
  delivery public.academy_access_deliveries;
  code public.academy_access_codes;
  grant_row public.academy_grants;
  order_row public.academy_orders;
  evidence text := btrim(p_evidence);
  audit_id uuid;
  changed integer;
BEGIN
  IF p_delivery IS NULL OR p_reviewer IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'DELIVERY_AND_REVIEWER_ARE_REQUIRED';
  END IF;
  IF evidence IS NULL OR char_length(evidence) NOT BETWEEN 12 AND 500 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PROVIDER_EVIDENCE_MUST_BE_12_TO_500_CHARACTERS';
  END IF;

  -- Use the same lock order as issuance, reconciliation and the failed-delivery
  -- recovery path so all eligibility evidence is checked as one transaction.
  SELECT * INTO delivery_hint
  FROM public.academy_access_deliveries
  WHERE id = p_delivery;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCESS_DELIVERY_NOT_FOUND';
  END IF;

  SELECT * INTO code_hint
  FROM public.academy_access_codes
  WHERE id = delivery_hint.code_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCESS_CODE_NOT_FOUND';
  END IF;

  SELECT * INTO order_row
  FROM public.academy_orders
  WHERE order_id = code_hint.order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACADEMY_ORDER_NOT_FOUND';
  END IF;

  SELECT * INTO grant_row
  FROM public.academy_grants
  WHERE order_id = code_hint.order_id
    AND line_id = code_hint.line_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACADEMY_GRANT_NOT_FOUND';
  END IF;

  SELECT * INTO code
  FROM public.academy_access_codes
  WHERE id = code_hint.id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCESS_CODE_NOT_FOUND';
  END IF;

  SELECT * INTO delivery
  FROM public.academy_access_deliveries
  WHERE id = p_delivery
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCESS_DELIVERY_NOT_FOUND';
  END IF;

  IF delivery.status IS DISTINCT FROM 'unknown'
    OR delivery.send_attempted_at IS NULL
    OR delivery.completed_at IS NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'ACCESS_DELIVERY_IS_NOT_RECONCILABLE_UNKNOWN';
  END IF;

  IF delivery.code_id IS DISTINCT FROM code.id
    OR delivery.generation IS DISTINCT FROM code.generation
    OR code.order_id IS DISTINCT FROM code_hint.order_id
    OR code.line_id IS DISTINCT FROM code_hint.line_id
    OR order_row.order_id IS DISTINCT FROM code.order_id
    OR grant_row.order_id IS DISTINCT FROM code.order_id
    OR grant_row.line_id IS DISTINCT FROM code.line_id
    OR code.redeemed_by IS NOT NULL
    OR code.redeemed_at IS NOT NULL
    OR code.access_until IS NOT NULL
    OR code.expires_at <= now()
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'ACCESS_CODE_IS_NOT_CURRENT_AND_REDEEMABLE';
  END IF;

  IF NOT grant_row.active
    OR grant_row.quantity <> 1
    OR grant_row.email IS DISTINCT FROM code.email
    OR grant_row.tier IS DISTINCT FROM code.tier
    OR order_row.needs_review
    OR order_row.email IS DISTINCT FROM code.email
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'PURCHASE_IS_NOT_ELIGIBLE_FOR_ACCESS_DELIVERY';
  END IF;

  -- Record the reviewed before-state and provider reference before the state
  -- transition. Both writes remain atomic if any later guard rejects the move.
  INSERT INTO public.academy_events(user_id, name, payload)
  VALUES (
    p_reviewer,
    'access_delivery_unknown_reconciled_by_operator',
    jsonb_build_object(
      'reviewerId', p_reviewer,
      'deliveryId', delivery.id,
      'eventId', delivery.id,
      'orderId', code.order_id,
      'lineId', code.line_id,
      'codeId', code.id,
      'generation', code.generation,
      'priorStatus', delivery.status,
      'priorAttempts', delivery.attempts,
      'priorLockedAt', delivery.locked_at,
      'priorCompletedAt', delivery.completed_at,
      'priorSendAttemptedAt', delivery.send_attempted_at,
      'providerEvidence', evidence
    )
  )
  RETURNING id INTO audit_id;

  -- The trigger permits UNKNOWN -> pending only while this transaction carries
  -- the exact delivery id reviewed above. The send-attempt marker is retained.
  PERFORM pg_catalog.set_config(
    'academy.reviewed_access_delivery_recovery_id',
    delivery.id::text,
    true
  );

  UPDATE public.academy_access_deliveries
  SET status = 'pending',
      due_at = now(),
      attempts = 0,
      locked_at = NULL,
      completed_at = NULL
  WHERE id = delivery.id
    AND status = 'unknown'
    AND send_attempted_at = delivery.send_attempted_at
    AND generation = code.generation;
  GET DIAGNOSTICS changed = ROW_COUNT;

  PERFORM pg_catalog.set_config('academy.reviewed_access_delivery_recovery_id', '', true);

  IF changed <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'ACCESS_DELIVERY_CHANGED_DURING_REVIEW';
  END IF;

  RETURN jsonb_build_object(
    'requeued', true,
    'recovery', 'provider_reconciled_unknown',
    'deliveryId', delivery.id,
    'eventId', delivery.id,
    'orderId', code.order_id,
    'codeId', code.id,
    'reviewerId', p_reviewer,
    'auditEventId', audit_id
  );
END;
$$;

COMMENT ON FUNCTION public.academy_requeue_reconciled_unknown_access_delivery(uuid, uuid, text) IS
  'Operator-reviewed UNKNOWN recovery after provider evidence confirms a resend is appropriate. Preserves the delivery/GHL idempotency event ID and the original send-attempt marker.';

REVOKE ALL ON FUNCTION public.academy_guard_access_delivery_outcome()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.academy_requeue_failed_access_delivery(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.academy_requeue_reconciled_unknown_access_delivery(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_guard_access_delivery_outcome()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_requeue_failed_access_delivery(uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_requeue_reconciled_unknown_access_delivery(uuid, uuid, text)
  TO service_role;

COMMIT;
