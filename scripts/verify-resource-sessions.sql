-- scripts/verify-resource-sessions.sql
--
-- Transaction-safe QA verification of the access-token / session /
-- entitlement pipeline. All identifiers are generated inside the
-- transaction, every assertion runs in a DO block, and the transaction
-- ROLLBACKs at the end. Nothing persists.
--
-- Run with:
--   psql -v ON_ERROR_STOP=1 -f scripts/verify-resource-sessions.sql

\set ON_ERROR_STOP on
\timing off

BEGIN;

CREATE TEMP TABLE qa_ids ON COMMIT DROP AS
SELECT
  'qa+verify@nuamenti.test'                    AS email,
  'qa_hash_ga_'    || substr(md5(random()::text||random()::text),1,40) AS tok_ga,
  'qa_hash_vault_' || substr(md5(random()::text||random()::text),1,40) AS tok_vault,
  'qa_hash_exp_'   || substr(md5(random()::text||random()::text),1,40) AS tok_expired,
  'qa_hash_rev_'   || substr(md5(random()::text||random()::text),1,40) AS tok_revoked,
  'qa_sess_a_'     || substr(md5(random()::text||random()::text),1,40) AS sess_a,
  'qa_sess_m_'     || substr(md5(random()::text||random()::text),1,40) AS sess_multi,
  'qa_pay_ga_'     || substr(md5(random()::text||random()::text),1,40) AS pay_ga,
  'qa_pay_vault_'  || substr(md5(random()::text||random()::text),1,40) AS pay_vault,
  'qa_pay_vipup_'  || substr(md5(random()::text||random()::text),1,40) AS pay_vipup;

-- Seed: two independent entitlements (GA and Vault) for one buyer.
INSERT INTO public.entitlements (buyer_email, product)
SELECT email, 'ga'    FROM qa_ids
UNION ALL
SELECT email, 'vault' FROM qa_ids;

-- Seed tokens: two live, one expired, one revoked.
INSERT INTO public.access_tokens (token_hash, buyer_email, scope, expires_at)
SELECT tok_ga,      email, 'ga',    now() + interval '1 hour' FROM qa_ids
UNION ALL
SELECT tok_vault,   email, 'vault', now() + interval '1 hour' FROM qa_ids
UNION ALL
SELECT tok_expired, email, 'ga',    now() - interval '1 hour' FROM qa_ids;

INSERT INTO public.access_tokens (token_hash, buyer_email, scope, expires_at, revoked_at)
SELECT tok_revoked, email, 'ga', now() + interval '1 hour', now() FROM qa_ids;

-- ------------------------------------------------------------------
-- TEST 1: first exchange succeeds; scopes include both GA and Vault.
-- ------------------------------------------------------------------
DO $$
DECLARE r record; ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  SELECT * INTO r FROM public.exchange_access_token(ids.tok_ga, ids.sess_a, 3600);
  IF r.buyer_email IS NULL THEN RAISE EXCEPTION 'TEST1 FAIL'; END IF;
  IF NOT (r.scopes @> ARRAY['ga','vault']) THEN
    RAISE EXCEPTION 'TEST1 FAIL scopes=%', r.scopes;
  END IF;
  RAISE NOTICE 'TEST1 PASS first-exchange scopes=%', r.scopes;
END $$;

-- TEST 2: reuse of same magic token fails.
DO $$
DECLARE ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  BEGIN
    PERFORM public.exchange_access_token(ids.tok_ga, ids.sess_a || '_x', 3600);
    RAISE EXCEPTION 'TEST2 FAIL: reuse succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT ILIKE '%token not exchangeable%' THEN
      RAISE EXCEPTION 'TEST2 FAIL wrong error: %', SQLERRM;
    END IF;
    RAISE NOTICE 'TEST2 PASS reuse rejected';
  END;
END $$;

-- TEST 3: expired token fails.
DO $$
DECLARE ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  BEGIN
    PERFORM public.exchange_access_token(ids.tok_expired, ids.sess_a || '_e', 3600);
    RAISE EXCEPTION 'TEST3 FAIL: expired succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT ILIKE '%token not exchangeable%' THEN
      RAISE EXCEPTION 'TEST3 FAIL wrong error: %', SQLERRM;
    END IF;
    RAISE NOTICE 'TEST3 PASS expired rejected';
  END;
END $$;

-- TEST 4: explicitly revoked token fails.
DO $$
DECLARE ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  BEGIN
    PERFORM public.exchange_access_token(ids.tok_revoked, ids.sess_a || '_r', 3600);
    RAISE EXCEPTION 'TEST4 FAIL: revoked succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT ILIKE '%token not exchangeable%' THEN
      RAISE EXCEPTION 'TEST4 FAIL wrong error: %', SQLERRM;
    END IF;
    RAISE NOTICE 'TEST4 PASS revoked rejected';
  END;
END $$;

-- TEST 5: fresh session via the Vault token returns BOTH scopes.
DO $$
DECLARE r record; ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  SELECT * INTO r FROM public.exchange_access_token(ids.tok_vault, ids.sess_multi, 3600);
  IF NOT (r.scopes @> ARRAY['ga','vault']) THEN
    RAISE EXCEPTION 'TEST5 FAIL scopes=%', r.scopes;
  END IF;
  RAISE NOTICE 'TEST5 PASS multi-scope session scopes=%', r.scopes;
END $$;

-- TEST 6: revoking GA entitlement removes it from current session scopes.
SELECT public._qa_toggle_entitlement((SELECT email FROM qa_ids), 'ga', true);
DO $$
DECLARE r record; ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  SELECT * INTO r FROM public.session_active_scopes(ids.sess_multi);
  IF 'ga' = ANY(r.scopes) THEN
    RAISE EXCEPTION 'TEST6 FAIL: revoked GA still visible: %', r.scopes;
  END IF;
  IF NOT ('vault' = ANY(r.scopes)) THEN
    RAISE EXCEPTION 'TEST6 FAIL: vault gone: %', r.scopes;
  END IF;
  RAISE NOTICE 'TEST6 PASS post-revoke scopes=%', r.scopes;
END $$;
-- Reactivate GA for the refund tests below.
SELECT public._qa_toggle_entitlement((SELECT email FROM qa_ids), 'ga', false);


-- TEST 7: refund of the Vault purchase does NOT touch GA.
INSERT INTO public.summit_registrations
  (full_name, email, phone, tier, admission_product, amount_cents, currency,
   commas_payment_id, status, payment_status)
SELECT 'QA GA', email, NULL, 'ga', 'ga', 2200, 'USD',
       pay_ga, 'confirmed', 'confirmed' FROM qa_ids;

INSERT INTO public.summit_vault_purchases
  (registration_id, buyer_email, amount_cents, currency, commas_payment_id, payment_status)
SELECT (SELECT id FROM public.summit_registrations
         WHERE commas_payment_id = q.pay_ga),
       q.email, 19900, 'USD', q.pay_vault, 'confirmed'
FROM qa_ids q;

DO $$
DECLARE ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  PERFORM public.reverse_summit_payment(ids.pay_vault);
  IF NOT EXISTS (SELECT 1 FROM public.entitlements
                 WHERE buyer_email = ids.email
                   AND product = 'ga' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST7 FAIL: GA revoked by vault refund';
  END IF;
  IF EXISTS (SELECT 1 FROM public.entitlements
             WHERE buyer_email = ids.email
               AND product = 'vault' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST7 FAIL: vault still active after refund';
  END IF;
  RAISE NOTICE 'TEST7 PASS vault refund preserves GA';
END $$;

-- TEST 8: VIP-upgrade refund preserves GA.
INSERT INTO public.summit_vip_upgrades
  (registration_id, buyer_email, amount_cents, currency, commas_payment_id, payment_status)
SELECT (SELECT id FROM public.summit_registrations
         WHERE commas_payment_id = q.pay_ga),
       q.email, 5500, 'USD', q.pay_vipup, 'confirmed'
FROM qa_ids q;

UPDATE public.summit_registrations SET tier = 'vip'
  WHERE commas_payment_id = (SELECT pay_ga FROM qa_ids);

INSERT INTO public.entitlements (buyer_email, product)
SELECT email, 'vip' FROM qa_ids
ON CONFLICT (buyer_email, product) DO UPDATE SET revoked_at = NULL;

DO $$
DECLARE ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  PERFORM public.reverse_summit_payment(ids.pay_vipup);
  IF NOT EXISTS (SELECT 1 FROM public.entitlements
                 WHERE buyer_email = ids.email
                   AND product = 'ga' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST8 FAIL: GA revoked by vip-upgrade refund';
  END IF;
  IF EXISTS (SELECT 1 FROM public.entitlements
             WHERE buyer_email = ids.email
               AND product = 'vip' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST8 FAIL: VIP still active after upgrade refund';
  END IF;
  RAISE NOTICE 'TEST8 PASS vip-upgrade refund preserves GA';
END $$;

-- Sanity check in-transaction row visibility.
SELECT 'in_txn_tokens' AS what, count(*) AS n
  FROM public.access_tokens
  WHERE buyer_email = (SELECT email FROM qa_ids);

ROLLBACK;

-- Post-rollback persistence check: MUST be zero.
SELECT 'persisted_tokens'   AS what, count(*) AS n
  FROM public.access_tokens
  WHERE buyer_email = 'qa+verify@nuamenti.test';

SELECT 'persisted_regs'     AS what, count(*) AS n
  FROM public.summit_registrations
  WHERE email = 'qa+verify@nuamenti.test';

SELECT 'persisted_vault'    AS what, count(*) AS n
  FROM public.summit_vault_purchases
  WHERE buyer_email = 'qa+verify@nuamenti.test';

SELECT 'persisted_vipup'    AS what, count(*) AS n
  FROM public.summit_vip_upgrades
  WHERE buyer_email = 'qa+verify@nuamenti.test';

SELECT 'persisted_ent'      AS what, count(*) AS n
  FROM public.entitlements
  WHERE buyer_email = 'qa+verify@nuamenti.test';
