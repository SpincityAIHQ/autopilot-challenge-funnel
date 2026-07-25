
-- Belt-and-suspenders: drop the temporary QA helper if a previous
-- migration didn't already remove it.
DROP FUNCTION IF EXISTS public._qa_toggle_entitlement(text, text, boolean);

-- Revoke sandbox_exec access to every private PII/payment/token/consent table.
REVOKE SELECT, INSERT, UPDATE, DELETE ON
  public.access_tokens,
  public.affiliate_clicks,
  public.challenge_payment_events,
  public.challenge_registrations,
  public.consent_events,
  public.delivery_outbox,
  public.entitlements,
  public.founder_seats,
  public.intensive_eligibility,
  public.intensive_slots,
  public.keynote_waitlist,
  public.marketing_consents,
  public.mentorship_applications,
  public.resource_sessions,
  public.summit_payment_events,
  public.summit_registrations,
  public.summit_vault_purchases,
  public.summit_vip_upgrades
FROM sandbox_exec;

-- Revoke EXECUTE from sandbox_exec on every sensitive function.
REVOKE EXECUTE ON FUNCTION
  public.fulfill_summit_payment(text, text, integer, text, text, text, text, jsonb, jsonb),
  public.reverse_summit_payment(text),
  public.fulfill_challenge_payment(text, text, boolean, integer, text, text, text, text),
  public.claim_lowest_founder_seat(uuid),
  public.claim_lowest_intensive_slot(text, text),
  public.exchange_access_token(text, text, integer),
  public.session_active_scopes(text),
  public.entitlement_by_token_hash(text),
  public.enforce_admission_product_immutable(),
  public.update_updated_at_column()
FROM sandbox_exec;

-- Leave the public read-only aggregates (founder_seats_remaining,
-- intensive_slots_remaining) as-is: they are safe by design.
