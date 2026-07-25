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
  'qa+scen-a@nuamenti.test'                    AS email_a,
  'qa+scen-b@nuamenti.test'                    AS email_b,
  'qa+scen-c@nuamenti.test'                    AS email_c,
  'qa+scen-d@nuamenti.test'                    AS email_d,
  'qa+scen-e@nuamenti.test'                    AS email_e,
  'qa+scen-f@nuamenti.test'                    AS email_f,
  'qa+scen-g@nuamenti.test'                    AS email_g,
  'qa_hash_ga_'    || substr(md5(random()::text||random()::text),1,40) AS tok_ga,
  'qa_hash_vault_' || substr(md5(random()::text||random()::text),1,40) AS tok_vault,
  'qa_hash_exp_'   || substr(md5(random()::text||random()::text),1,40) AS tok_expired,
  'qa_hash_rev_'   || substr(md5(random()::text||random()::text),1,40) AS tok_revoked,
  'qa_hash_ga_d_'  || substr(md5(random()::text||random()::text),1,40) AS tok_ga_d,
  'qa_sess_a_'     || substr(md5(random()::text||random()::text),1,40) AS sess_a,
  'qa_sess_m_'     || substr(md5(random()::text||random()::text),1,40) AS sess_multi,
  'qa_sess_d_'     || substr(md5(random()::text||random()::text),1,40) AS sess_d,
  'qa_pay_seed_ga_'    || substr(md5(random()::text||random()::text),1,40) AS pay_seed_ga,
  'qa_pay_seed_vault_' || substr(md5(random()::text||random()::text),1,40) AS pay_seed_vault,
  'qa_pay_ga_a_'    || substr(md5(random()::text||random()::text),1,40) AS pay_ga_a,
  'qa_pay_vault_a_' || substr(md5(random()::text||random()::text),1,40) AS pay_vault_a,
  'qa_pay_ga_b_'    || substr(md5(random()::text||random()::text),1,40) AS pay_ga_b,
  'qa_pay_vault_b_' || substr(md5(random()::text||random()::text),1,40) AS pay_vault_b,
  'qa_pay_ga_c_'    || substr(md5(random()::text||random()::text),1,40) AS pay_ga_c,
  'qa_pay_vipup_c_' || substr(md5(random()::text||random()::text),1,40) AS pay_vipup_c,
  'qa_pay_ga_d_'    || substr(md5(random()::text||random()::text),1,40) AS pay_ga_d,
  'qa_pay_vault_d_' || substr(md5(random()::text||random()::text),1,40) AS pay_vault_d,
  -- TEST9: Vault repurchase after refund (out-of-order duplicate refund).
  'qa_pay_ga_e_'      || substr(md5(random()::text||random()::text),1,40) AS pay_ga_e,
  'qa_pay_vault_e1_'  || substr(md5(random()::text||random()::text),1,40) AS pay_vault_e1,
  'qa_pay_vault_e2_'  || substr(md5(random()::text||random()::text),1,40) AS pay_vault_e2,
  -- TEST10: VIP-upgrade repurchase after refund.
  'qa_pay_ga_f_'      || substr(md5(random()::text||random()::text),1,40) AS pay_ga_f,
  'qa_pay_vipup_f1_'  || substr(md5(random()::text||random()::text),1,40) AS pay_vipup_f1,
  'qa_pay_vipup_f2_'  || substr(md5(random()::text||random()::text),1,40) AS pay_vipup_f2,
  -- TEST11: Intensive repurchase after refund.
  'qa_pay_ga_g_'         || substr(md5(random()::text||random()::text),1,40) AS pay_ga_g,
  'qa_pay_intensive_g1_' || substr(md5(random()::text||random()::text),1,40) AS pay_intensive_g1,
  'qa_pay_intensive_g2_' || substr(md5(random()::text||random()::text),1,40) AS pay_intensive_g2;


-- Seed: two independent entitlements (GA and Vault) for one buyer, each with
-- its own source_payment_id so the new provenance model accepts them.
INSERT INTO public.entitlements (buyer_email, product, source_payment_id)
SELECT email, 'ga',    pay_seed_ga    FROM qa_ids
UNION ALL
SELECT email, 'vault', pay_seed_vault FROM qa_ids;

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

-- ------------------------------------------------------------------
-- TEST 6: revocation via the production reversal path removes the
-- revoked scope from an already-active session, without touching an
-- independently paid scope for the same buyer.
-- Uses email_d — distinct from TEST7/TEST8 so scenarios never overlap.
-- ------------------------------------------------------------------
DO $$
DECLARE r record; ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;

  -- 1. Fulfill GA + Vault for email_d (real fulfillment path, no helpers).
  PERFORM public.fulfill_summit_payment('ga',    ids.pay_ga_d,    2200, 'USD',
    'QA D', ids.email_d, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vault', ids.pay_vault_d, 19900, 'USD',
    'QA D', ids.email_d, NULL, NULL, NULL);

  -- 2. Mint an access token for GA scope on this buyer, then exchange it.
  INSERT INTO public.access_tokens (token_hash, buyer_email, scope, expires_at)
  VALUES (ids.tok_ga_d, ids.email_d, 'ga', now() + interval '1 hour');
  SELECT * INTO r FROM public.exchange_access_token(ids.tok_ga_d, ids.sess_d, 3600);
  IF NOT (r.scopes @> ARRAY['ga','vault']) THEN
    RAISE EXCEPTION 'TEST6 FAIL pre-revoke scopes=%', r.scopes;
  END IF;

  -- 3. Reverse the GA payment through the production reversal RPC.
  PERFORM public.reverse_summit_payment(ids.pay_ga_d);

  -- 4. Re-read the same session; GA must be gone, Vault must remain.
  SELECT * INTO r FROM public.session_active_scopes(ids.sess_d);
  IF 'ga' = ANY(r.scopes) THEN
    RAISE EXCEPTION 'TEST6 FAIL: revoked GA still visible: %', r.scopes;
  END IF;
  IF NOT ('vault' = ANY(r.scopes)) THEN
    RAISE EXCEPTION 'TEST6 FAIL: independent Vault gone: %', r.scopes;
  END IF;
  RAISE NOTICE 'TEST6 PASS post-revoke session scopes=%', r.scopes;
END $$;



-- TEST 7a: refund of the GA admission does NOT touch an independently paid Vault.
-- Distinct QA email so no other scenario contaminates this assertion.
DO $$
DECLARE ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  PERFORM public.fulfill_summit_payment('ga', ids.pay_ga_a, 2200, 'USD',
    'QA A', ids.email_a, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vault', ids.pay_vault_a, 19900, 'USD',
    'QA A', ids.email_a, NULL, NULL, NULL);
  PERFORM public.reverse_summit_payment(ids.pay_ga_a);
  IF EXISTS (SELECT 1 FROM public.entitlements
             WHERE buyer_email = ids.email_a
               AND product = 'ga' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST7a FAIL: GA still active after GA refund';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.entitlements
                 WHERE buyer_email = ids.email_a
                   AND product = 'vault' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST7a FAIL: independently paid Vault revoked by GA refund';
  END IF;
  RAISE NOTICE 'TEST7a PASS GA refund preserves independent Vault';
END $$;

-- TEST 7b: refund of the Vault purchase does NOT touch GA.
DO $$
DECLARE ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  PERFORM public.fulfill_summit_payment('ga', ids.pay_ga_b, 2200, 'USD',
    'QA B', ids.email_b, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vault', ids.pay_vault_b, 19900, 'USD',
    'QA B', ids.email_b, NULL, NULL, NULL);
  PERFORM public.reverse_summit_payment(ids.pay_vault_b);
  IF NOT EXISTS (SELECT 1 FROM public.entitlements
                 WHERE buyer_email = ids.email_b
                   AND product = 'ga' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST7b FAIL: GA revoked by vault refund';
  END IF;
  IF EXISTS (SELECT 1 FROM public.entitlements
             WHERE buyer_email = ids.email_b
               AND product = 'vault' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST7b FAIL: vault still active after refund';
  END IF;
  RAISE NOTICE 'TEST7b PASS vault refund preserves GA';
END $$;

-- TEST 8: VIP-upgrade refund preserves GA. Distinct email per scenario.
DO $$
DECLARE ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  PERFORM public.fulfill_summit_payment('ga', ids.pay_ga_c, 2200, 'USD',
    'QA C', ids.email_c, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vip_upgrade', ids.pay_vipup_c, 5500, 'USD',
    'QA C', ids.email_c, NULL, NULL, NULL);
  PERFORM public.reverse_summit_payment(ids.pay_vipup_c);
  IF NOT EXISTS (SELECT 1 FROM public.entitlements
                 WHERE buyer_email = ids.email_c
                   AND product = 'ga' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST8 FAIL: GA revoked by vip-upgrade refund';
  END IF;
  IF EXISTS (SELECT 1 FROM public.entitlements
             WHERE buyer_email = ids.email_c
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

-- Post-rollback persistence check: MUST be zero across every QA email.
SELECT 'persisted_tokens'   AS what, count(*) AS n
  FROM public.access_tokens
  WHERE buyer_email IN ('qa+verify@nuamenti.test','qa+scen-a@nuamenti.test','qa+scen-b@nuamenti.test','qa+scen-c@nuamenti.test','qa+scen-d@nuamenti.test');

SELECT 'persisted_regs'     AS what, count(*) AS n
  FROM public.summit_registrations
  WHERE email IN ('qa+verify@nuamenti.test','qa+scen-a@nuamenti.test','qa+scen-b@nuamenti.test','qa+scen-c@nuamenti.test','qa+scen-d@nuamenti.test');

SELECT 'persisted_vault'    AS what, count(*) AS n
  FROM public.summit_vault_purchases
  WHERE buyer_email IN ('qa+verify@nuamenti.test','qa+scen-a@nuamenti.test','qa+scen-b@nuamenti.test','qa+scen-c@nuamenti.test','qa+scen-d@nuamenti.test');

SELECT 'persisted_vipup'    AS what, count(*) AS n
  FROM public.summit_vip_upgrades
  WHERE buyer_email IN ('qa+verify@nuamenti.test','qa+scen-a@nuamenti.test','qa+scen-b@nuamenti.test','qa+scen-c@nuamenti.test','qa+scen-d@nuamenti.test');

SELECT 'persisted_ent'      AS what, count(*) AS n
  FROM public.entitlements
  WHERE buyer_email IN ('qa+verify@nuamenti.test','qa+scen-a@nuamenti.test','qa+scen-b@nuamenti.test','qa+scen-c@nuamenti.test','qa+scen-d@nuamenti.test');
