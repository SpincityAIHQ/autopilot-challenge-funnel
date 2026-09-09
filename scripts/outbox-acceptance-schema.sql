BEGIN;
ALTER TABLE public.academy_outbox DROP CONSTRAINT IF EXISTS academy_outbox_status_check;
ALTER TABLE public.academy_outbox ADD CONSTRAINT academy_outbox_status_check
  CHECK(status IN ('pending','processing','accepted','delivered','cancelled','unknown','retry'));
-- Earlier app versions used delivered for inbound-webhook HTTP 2xx, without an inbox receipt.
-- Correct those historical labels before deploying the new sender.
UPDATE public.academy_outbox SET status='accepted' WHERE status='delivered';
COMMENT ON COLUMN public.academy_outbox.status IS
  'accepted: webhook HTTP 2xx only; delivered is reserved for verified provider delivery receipts. unknown requires reconciliation, never blind resend.';
NOTIFY pgrst, 'reload schema';
COMMIT;
