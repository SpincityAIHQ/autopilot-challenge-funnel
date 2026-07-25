-- 1) Add phone column to marketing_consents (kept nullable; required only for sms/ai_call in app validation).
ALTER TABLE public.marketing_consents
  ADD COLUMN IF NOT EXISTS phone text;

-- 2) Drop legacy QA helper. Managed sandbox_exec role (internal Lovable QA)
--    continues to run production RPCs directly; browser roles remain denied.
DROP FUNCTION IF EXISTS public._qa_toggle_entitlement(text, text, boolean);