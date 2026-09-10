-- Apply before selecting ACADEMY_GHL_TRANSPORT=api.
-- Existing service-role-only privileges and RLS remain unchanged.
BEGIN;
ALTER TABLE public.academy_outbox ADD COLUMN IF NOT EXISTS provider_receipt jsonb;
ALTER TABLE public.academy_access_deliveries ADD COLUMN IF NOT EXISTS provider_receipt jsonb;
COMMENT ON COLUMN public.academy_outbox.provider_receipt IS 'Sanitized channel/provider IDs and acceptance evidence; not a delivery receipt.';
COMMENT ON COLUMN public.academy_access_deliveries.provider_receipt IS 'Sanitized channel/provider IDs and acceptance evidence; not a delivery receipt.';
COMMIT;
