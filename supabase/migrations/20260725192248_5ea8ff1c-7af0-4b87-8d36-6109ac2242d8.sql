
DO $$
DECLARE
  t text;
  f text;
  private_tables text[] := ARRAY[
    'summit_registrations','summit_vault_purchases','summit_vip_upgrades',
    'intensive_slots','entitlements','access_tokens','resource_sessions',
    'marketing_consents','mentorship_applications','keynote_waitlist',
    'delivery_outbox','affiliate_clicks','challenge_registrations',
    'challenge_payment_events','summit_payment_events','consent_events',
    'founder_seats','intensive_eligibility'
  ];
  sensitive_fns text[] := ARRAY[
    'fulfill_summit_payment','reverse_summit_payment','fulfill_challenge_payment',
    'exchange_access_token','session_active_scopes','entitlement_by_token_hash',
    'claim_lowest_founder_seat','claim_lowest_intensive_slot',
    'enforce_admission_product_immutable','consume_rate_limit',
    'revoke_resource_session'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='sandbox_exec') THEN
    RAISE NOTICE 'sandbox_exec role absent — nothing to revoke';
    RETURN;
  END IF;

  FOREACH t IN ARRAY private_tables LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM sandbox_exec', t);
  END LOOP;

  FOREACH f IN ARRAY sensitive_fns LOOP
    -- Function may or may not exist depending on migration history; guard.
    IF EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname=f
    ) THEN
      EXECUTE format(
        'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM sandbox_exec'
      );
      EXIT; -- one REVOKE ALL is sufficient
    END IF;
  END LOOP;

  -- Re-grant EXECUTE on the two safe read-only aggregates so ops tools can
  -- still call them if they run as sandbox_exec.
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='founder_seats_remaining') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.founder_seats_remaining() TO sandbox_exec';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='intensive_slots_remaining') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.intensive_slots_remaining() TO sandbox_exec';
  END IF;
END $$;
