
CREATE OR REPLACE FUNCTION public.enforce_admission_product_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admission_product IS DISTINCT FROM OLD.admission_product THEN
    RAISE EXCEPTION 'admission_product is immutable after insert'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

-- Lock the trigger function from broad callers; the trigger executes it
-- automatically as the row owner so no EXECUTE grants are needed.
REVOKE ALL ON FUNCTION public.enforce_admission_product_immutable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_admission_product_immutable() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_admission_product_immutable() FROM authenticated;

DROP TRIGGER IF EXISTS trg_admission_product_immutable
  ON public.summit_registrations;

CREATE TRIGGER trg_admission_product_immutable
  BEFORE UPDATE OF admission_product ON public.summit_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admission_product_immutable();
