ALTER TABLE public.summit_audit
  ADD COLUMN IF NOT EXISTS verification text NOT NULL DEFAULT 'entitlement_match';

UPDATE public.summit_audit SET verification = 'entitlement_match' WHERE verification IS NULL;

ALTER TABLE public.summit_audit
  DROP CONSTRAINT IF EXISTS summit_audit_verification_check;
ALTER TABLE public.summit_audit
  ADD CONSTRAINT summit_audit_verification_check
  CHECK (verification IN ('session','entitlement_match'));