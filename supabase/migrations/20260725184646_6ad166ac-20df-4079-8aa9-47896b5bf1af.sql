
CREATE OR REPLACE FUNCTION public._qa_toggle_entitlement(_email text, _product text, _revoke boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _email IS NULL OR _email NOT LIKE '%@nuamenti.test' THEN
    RAISE EXCEPTION 'qa helper refuses non-test email' USING ERRCODE = 'P0001';
  END IF;
  IF _revoke THEN
    UPDATE public.entitlements SET revoked_at = now()
      WHERE buyer_email = _email AND product = _product;
  ELSE
    UPDATE public.entitlements SET revoked_at = NULL
      WHERE buyer_email = _email AND product = _product;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._qa_toggle_entitlement(text,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._qa_toggle_entitlement(text,text,boolean) FROM anon;
REVOKE ALL ON FUNCTION public._qa_toggle_entitlement(text,text,boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._qa_toggle_entitlement(text,text,boolean) TO service_role, sandbox_exec;

-- Also allow sandbox_exec to run the fulfillment/reversal RPCs the QA
-- script needs for TEST7/TEST8 (they are SECURITY DEFINER and only touch
-- rows for the caller-supplied ids). No PII leaks — they return only
-- product/slot/registration_id.
GRANT EXECUTE ON FUNCTION public.reverse_summit_payment(text) TO sandbox_exec;
GRANT EXECUTE ON FUNCTION public.exchange_access_token(text,text,integer) TO sandbox_exec;
GRANT EXECUTE ON FUNCTION public.session_active_scopes(text) TO sandbox_exec;
