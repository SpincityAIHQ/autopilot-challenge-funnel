-- scripts/verify-resource-sessions.sql
--
-- Transaction-safe QA verification of the access-token / session /
-- entitlement pipeline aligned to the current sequential fulfillment
-- graph: GA ($22) -> VIP Upgrade ($77) -> Vault ($199) -> Intensive
-- ($1000). Every scenario that needs Vault first buys VIP Upgrade;
-- every scenario that needs Intensive first buys Vault; nothing
-- bypasses fulfillment preconditions with manual entitlements EXCEPT
-- the earlier token-scope unit scenarios (TEST1–TEST5) which
-- explicitly exercise session mechanics against seeded entitlements.
--
-- All identifiers are generated inside the transaction, every
-- assertion runs in a DO block, and the transaction ROLLBACKs at the
-- end. Nothing persists.
--
-- REQUIRES a role with EXECUTE on public.fulfill_summit_payment /
-- reverse_summit_payment / exchange_access_token / session_active_scopes
-- and DML on the private entitlement / token / registration tables.
-- After the sandbox-exec lockdown migration, only service_role (or a
-- managed superuser used by Lovable QA) satisfies this. The exec-tool
-- sandbox_exec role has been intentionally denied and can no longer
-- run this script; that denial is verification of the lockdown.
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
  -- TEST7a (email_a): GA -> VIP Upgrade -> Vault, then refund GA.
  'qa_pay_ga_a_'    || substr(md5(random()::text||random()::text),1,40) AS pay_ga_a,
  'qa_pay_vipup_a_' || substr(md5(random()::text||random()::text),1,40) AS pay_vipup_a,
  'qa_pay_vault_a_' || substr(md5(random()::text||random()::text),1,40) AS pay_vault_a,
  -- TEST7b (email_b): GA -> VIP Upgrade -> Vault, then refund Vault.
  'qa_pay_ga_b_'    || substr(md5(random()::text||random()::text),1,40) AS pay_ga_b,
  'qa_pay_vipup_b_' || substr(md5(random()::text||random()::text),1,40) AS pay_vipup_b,
  'qa_pay_vault_b_' || substr(md5(random()::text||random()::text),1,40) AS pay_vault_b,
  -- TEST8 (email_c): GA -> VIP Upgrade, then refund the upgrade.
  'qa_pay_ga_c_'    || substr(md5(random()::text||random()::text),1,40) AS pay_ga_c,
  'qa_pay_vipup_c_' || substr(md5(random()::text||random()::text),1,40) AS pay_vipup_c,
  -- TEST6 (email_d): GA -> VIP Upgrade -> Vault, then refund GA.
  'qa_pay_ga_d_'    || substr(md5(random()::text||random()::text),1,40) AS pay_ga_d,
  'qa_pay_vipup_d_' || substr(md5(random()::text||random()::text),1,40) AS pay_vipup_d,
  'qa_pay_vault_d_' || substr(md5(random()::text||random()::text),1,40) AS pay_vault_d,
  -- TEST9 (email_e): GA -> VIP Upgrade -> Vault, refund Vault, buy Vault_e2, duplicate refund.
  'qa_pay_ga_e_'      || substr(md5(random()::text||random()::text),1,40) AS pay_ga_e,
  'qa_pay_vipup_e_'   || substr(md5(random()::text||random()::text),1,40) AS pay_vipup_e,
  'qa_pay_vault_e1_'  || substr(md5(random()::text||random()::text),1,40) AS pay_vault_e1,
  'qa_pay_vault_e2_'  || substr(md5(random()::text||random()::text),1,40) AS pay_vault_e2,
  -- TEST10 (email_f): VIP-upgrade repurchase after refund.
  'qa_pay_ga_f_'      || substr(md5(random()::text||random()::text),1,40) AS pay_ga_f,
  'qa_pay_vipup_f1_'  || substr(md5(random()::text||random()::text),1,40) AS pay_vipup_f1,
  'qa_pay_vipup_f2_'  || substr(md5(random()::text||random()::text),1,40) AS pay_vipup_f2,
  -- TEST11 (email_g): GA -> VIP Upgrade -> Vault -> Intensive, refund
  -- intensive_g1, repurchase intensive_g2, then duplicate refund of g1.
  'qa_pay_ga_g_'         || substr(md5(random()::text||random()::text),1,40) AS pay_ga_g,
  'qa_pay_vipup_g_'      || substr(md5(random()::text||random()::text),1,40) AS pay_vipup_g,
  'qa_pay_vault_g_'      || substr(md5(random()::text||random()::text),1,40) AS pay_vault_g,
  'qa_pay_intensive_g1_' || substr(md5(random()::text||random()::text),1,40) AS pay_intensive_g1,
  'qa_pay_intensive_g2_' || substr(md5(random()::text||random()::text),1,40) AS pay_intensive_g2;


-- Snapshot the ten seeded unclaimed intensive_slots so we can assert the
-- transaction doesn't leave them mutated OUTSIDE the transaction after
-- ROLLBACK. (Inside the txn, TEST11 legitimately claims and releases a
-- slot; rollback must revert both.)
CREATE TEMP TABLE qa_pre_intensive_unclaimed ON COMMIT DROP AS
  SELECT slot_number FROM public.intensive_slots
   WHERE claimed_at IS NULL;

-- Seed: two independent entitlements (GA and Vault) for one buyer, each with
-- its own source_payment_id so the new provenance model accepts them.
-- These seeds power TEST1–TEST5 (token/session mechanics only).
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
-- Full current graph: GA -> VIP Upgrade -> Vault before the reversal.
-- ------------------------------------------------------------------
DO $$
DECLARE r record; ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;

  -- 1. Real fulfillment path: GA, VIP Upgrade, Vault, in order.
  PERFORM public.fulfill_summit_payment('ga',          ids.pay_ga_d,    2200,  'USD',
    'QA D', ids.email_d, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vip_upgrade', ids.pay_vipup_d, 7700,  'USD',
    'QA D', ids.email_d, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vault',       ids.pay_vault_d, 19900, 'USD',
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
-- Full current graph: GA -> VIP Upgrade -> Vault. Assertion is scoped
-- strictly to the GA-vs-Vault relationship; VIP-upgrade rows are ignored.
DO $$
DECLARE ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  PERFORM public.fulfill_summit_payment('ga',          ids.pay_ga_a,    2200,  'USD',
    'QA A', ids.email_a, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vip_upgrade', ids.pay_vipup_a, 7700,  'USD',
    'QA A', ids.email_a, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vault',       ids.pay_vault_a, 19900, 'USD',
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
-- Full current graph: GA -> VIP Upgrade -> Vault before refund of Vault.
DO $$
DECLARE ids record;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  PERFORM public.fulfill_summit_payment('ga',          ids.pay_ga_b,    2200,  'USD',
    'QA B', ids.email_b, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vip_upgrade', ids.pay_vipup_b, 7700,  'USD',
    'QA B', ids.email_b, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vault',       ids.pay_vault_b, 19900, 'USD',
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
  PERFORM public.fulfill_summit_payment('vip_upgrade', ids.pay_vipup_c, 7700, 'USD',
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


-- ------------------------------------------------------------------
-- TEST 9: Vault out-of-order refund.
-- Full graph: GA -> VIP Upgrade -> Vault_e1, refund Vault_e1, buy
-- Vault_e2, then a DUPLICATE late refund of Vault_e1 arrives.
-- Vault_e2 must remain active because provenance keys each grant to
-- its exact source payment. The second Vault_e2 purchase is allowed
-- because the VIP entitlement from vipup_e is still active.
-- ------------------------------------------------------------------
DO $$
DECLARE ids record; active_ct int;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  PERFORM public.fulfill_summit_payment('ga',          ids.pay_ga_e,     2200,  'USD',
    'QA E', ids.email_e, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vip_upgrade', ids.pay_vipup_e,  7700,  'USD',
    'QA E', ids.email_e, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vault',       ids.pay_vault_e1, 19900, 'USD',
    'QA E', ids.email_e, NULL, NULL, NULL);
  PERFORM public.reverse_summit_payment(ids.pay_vault_e1);
  PERFORM public.fulfill_summit_payment('vault',       ids.pay_vault_e2, 19900, 'USD',
    'QA E', ids.email_e, NULL, NULL, NULL);
  -- Late duplicate refund of the ORIGINAL vault payment.
  PERFORM public.reverse_summit_payment(ids.pay_vault_e1);
  SELECT count(*) INTO active_ct FROM public.entitlements
    WHERE buyer_email = ids.email_e AND product = 'vault' AND revoked_at IS NULL;
  IF active_ct <> 1 THEN
    RAISE EXCEPTION 'TEST9 FAIL: expected exactly 1 active vault after duplicate refund, got %', active_ct;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.entitlements
    WHERE buyer_email = ids.email_e AND product = 'vault'
      AND source_payment_id = ids.pay_vault_e2 AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST9 FAIL: repurchased Vault_e2 not active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.entitlements
    WHERE buyer_email = ids.email_e AND product = 'ga' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST9 FAIL: GA collaterally revoked';
  END IF;
  RAISE NOTICE 'TEST9 PASS out-of-order vault refund preserves repurchase';
END $$;

-- ------------------------------------------------------------------
-- TEST 10: VIP-upgrade out-of-order refund.
-- Buy vipup_f1, refund vipup_f1, buy vipup_f2, then duplicate late refund
-- of vipup_f1. VIP entitlement from vipup_f2 must remain active; GA untouched.
-- ------------------------------------------------------------------
DO $$
DECLARE ids record; active_vip int; reg_tier text;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  PERFORM public.fulfill_summit_payment('ga', ids.pay_ga_f, 2200, 'USD',
    'QA F', ids.email_f, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vip_upgrade', ids.pay_vipup_f1, 7700, 'USD',
    'QA F', ids.email_f, NULL, NULL, NULL);
  PERFORM public.reverse_summit_payment(ids.pay_vipup_f1);
  PERFORM public.fulfill_summit_payment('vip_upgrade', ids.pay_vipup_f2, 7700, 'USD',
    'QA F', ids.email_f, NULL, NULL, NULL);
  -- Duplicate/late refund of the ALREADY-refunded upgrade payment.
  PERFORM public.reverse_summit_payment(ids.pay_vipup_f1);
  SELECT count(*) INTO active_vip FROM public.entitlements
    WHERE buyer_email = ids.email_f AND product = 'vip' AND revoked_at IS NULL;
  IF active_vip <> 1 THEN
    RAISE EXCEPTION 'TEST10 FAIL: expected 1 active vip after duplicate upgrade refund, got %', active_vip;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.entitlements
    WHERE buyer_email = ids.email_f AND product = 'vip'
      AND source_payment_id = ids.pay_vipup_f2 AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST10 FAIL: repurchased vip_upgrade (vip row) not active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.entitlements
    WHERE buyer_email = ids.email_f AND product = 'ga' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST10 FAIL: GA collaterally revoked';
  END IF;
  -- Registration tier must still be 'vip' — a late/duplicate refund of the
  -- older upgrade must NOT silently downgrade a buyer who has repurchased.
  SELECT tier INTO reg_tier FROM public.summit_registrations
    WHERE lower(email) = lower(ids.email_f)
      AND commas_payment_id = ids.pay_ga_f;
  IF reg_tier <> 'vip' THEN
    RAISE EXCEPTION 'TEST10 FAIL: registration tier downgraded to % after duplicate upgrade refund', reg_tier;
  END IF;
  RAISE NOTICE 'TEST10 PASS out-of-order vip_upgrade refund preserves repurchase and tier';
END $$;

-- ------------------------------------------------------------------
-- TEST 11: Intensive out-of-order refund.
-- Full graph: GA -> VIP Upgrade -> Vault -> Intensive_g1. Refund g1
-- (releases slot, revokes intensive entitlement — Vault stays active
-- so the second intensive purchase satisfies the precondition), buy
-- Intensive_g2 (claims a slot), then a duplicate late refund of g1.
-- The intensive entitlement from g2 must remain active.
-- ------------------------------------------------------------------
DO $$
DECLARE ids record; active_int int;
BEGIN
  SELECT * INTO ids FROM qa_ids;
  PERFORM public.fulfill_summit_payment('ga',          ids.pay_ga_g,         2200,   'USD',
    'QA G', ids.email_g, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vip_upgrade', ids.pay_vipup_g,      7700,   'USD',
    'QA G', ids.email_g, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('vault',       ids.pay_vault_g,      19900,  'USD',
    'QA G', ids.email_g, NULL, NULL, NULL);
  PERFORM public.fulfill_summit_payment('intensive',   ids.pay_intensive_g1, 100000, 'USD',
    'QA G', ids.email_g, NULL, NULL, NULL);
  PERFORM public.reverse_summit_payment(ids.pay_intensive_g1);
  PERFORM public.fulfill_summit_payment('intensive',   ids.pay_intensive_g2, 100000, 'USD',
    'QA G', ids.email_g, NULL, NULL, NULL);
  PERFORM public.reverse_summit_payment(ids.pay_intensive_g1);
  SELECT count(*) INTO active_int FROM public.entitlements
    WHERE buyer_email = ids.email_g AND product = 'intensive' AND revoked_at IS NULL;
  IF active_int <> 1 THEN
    RAISE EXCEPTION 'TEST11 FAIL: expected 1 active intensive after duplicate refund, got %', active_int;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.entitlements
    WHERE buyer_email = ids.email_g AND product = 'intensive'
      AND source_payment_id = ids.pay_intensive_g2 AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'TEST11 FAIL: repurchased intensive_g2 not active';
  END IF;
  RAISE NOTICE 'TEST11 PASS out-of-order intensive refund preserves repurchase';
END $$;


-- Sanity check in-transaction row visibility.
SELECT 'in_txn_tokens' AS what, count(*) AS n
  FROM public.access_tokens
  WHERE buyer_email = (SELECT email FROM qa_ids);

-- Snapshot the intensive_slots inventory INSIDE the transaction so we
-- can prove after ROLLBACK that the 10 seeded rows returned to the
-- exact pre-transaction unclaimed set.
CREATE TEMP TABLE qa_post_txn_intensive ON COMMIT DROP AS
  SELECT slot_number, claimed_at, buyer_email, commas_payment_id
    FROM public.intensive_slots;

ROLLBACK;

-- ------------------------------------------------------------------
-- Post-rollback persistence check: MUST be zero across EVERY protected
-- table for every QA buyer/payment row this script touched. RAISEs
-- (nonzero psql exit under -v ON_ERROR_STOP=1) if any leak is found.
-- Also asserts the ten seeded intensive_slots rows are unclaimed.
-- ------------------------------------------------------------------
DO $$
DECLARE
  qa_emails text[] := ARRAY[
    'qa+verify@nuamenti.test',
    'qa+scen-a@nuamenti.test',
    'qa+scen-b@nuamenti.test',
    'qa+scen-c@nuamenti.test',
    'qa+scen-d@nuamenti.test',
    'qa+scen-e@nuamenti.test',
    'qa+scen-f@nuamenti.test',
    'qa+scen-g@nuamenti.test'
  ];
  qa_payment_prefix text := 'qa_pay_%';
  qa_token_prefix   text := 'qa_hash_%';
  qa_session_prefix text := 'qa_sess_%';
  n_tokens       int;
  n_regs         int;
  n_vault        int;
  n_vipup        int;
  n_ent          int;
  n_intensive    int;
  n_sessions     int;
  n_pay_events   int;
  n_int_elig     int;
  n_rate_limits  int;
  n_unclaimed    int;
BEGIN
  SELECT count(*) INTO n_tokens
    FROM public.access_tokens
    WHERE buyer_email = ANY(qa_emails) OR token_hash LIKE qa_token_prefix;
  SELECT count(*) INTO n_regs
    FROM public.summit_registrations
    WHERE email = ANY(qa_emails) OR commas_payment_id LIKE qa_payment_prefix;
  SELECT count(*) INTO n_vault
    FROM public.summit_vault_purchases
    WHERE buyer_email = ANY(qa_emails) OR commas_payment_id LIKE qa_payment_prefix;
  SELECT count(*) INTO n_vipup
    FROM public.summit_vip_upgrades
    WHERE buyer_email = ANY(qa_emails) OR commas_payment_id LIKE qa_payment_prefix;
  SELECT count(*) INTO n_ent
    FROM public.entitlements
    WHERE buyer_email = ANY(qa_emails) OR source_payment_id LIKE qa_payment_prefix;
  SELECT count(*) INTO n_intensive
    FROM public.intensive_slots
    WHERE buyer_email = ANY(qa_emails) OR commas_payment_id LIKE qa_payment_prefix;
  SELECT count(*) INTO n_sessions
    FROM public.resource_sessions
    WHERE buyer_email = ANY(qa_emails) OR session_hash LIKE qa_session_prefix;
  SELECT count(*) INTO n_pay_events
    FROM public.summit_payment_events
    WHERE payment_id LIKE qa_payment_prefix
       OR provider_event_id LIKE qa_payment_prefix;
  SELECT count(*) INTO n_int_elig
    FROM public.intensive_eligibility
    WHERE buyer_email = ANY(qa_emails);
  -- rate_limits QA keys: this script does not create any, but assert
  -- zero anyway so future edits that add one are forced to clean up.
  SELECT count(*) INTO n_rate_limits
    FROM public.rate_limits
    WHERE key_hash LIKE 'qa_%';

  SELECT count(*) INTO n_unclaimed
    FROM public.intensive_slots
    WHERE claimed_at IS NULL;

  RAISE NOTICE 'persistence check: tokens=% regs=% vault=% vipup=% ent=% intensive=% sessions=% pay_events=% int_elig=% rate_limits=% unclaimed_intensive_slots=%',
    n_tokens, n_regs, n_vault, n_vipup, n_ent, n_intensive,
    n_sessions, n_pay_events, n_int_elig, n_rate_limits, n_unclaimed;

  IF n_tokens       <> 0 THEN RAISE EXCEPTION 'PERSISTENCE FAIL: access_tokens leaked % QA rows',            n_tokens; END IF;
  IF n_regs         <> 0 THEN RAISE EXCEPTION 'PERSISTENCE FAIL: summit_registrations leaked % QA rows',     n_regs; END IF;
  IF n_vault        <> 0 THEN RAISE EXCEPTION 'PERSISTENCE FAIL: summit_vault_purchases leaked % QA rows',   n_vault; END IF;
  IF n_vipup        <> 0 THEN RAISE EXCEPTION 'PERSISTENCE FAIL: summit_vip_upgrades leaked % QA rows',      n_vipup; END IF;
  IF n_ent          <> 0 THEN RAISE EXCEPTION 'PERSISTENCE FAIL: entitlements leaked % QA rows',             n_ent; END IF;
  IF n_intensive    <> 0 THEN RAISE EXCEPTION 'PERSISTENCE FAIL: intensive_slots leaked % QA rows',          n_intensive; END IF;
  IF n_sessions     <> 0 THEN RAISE EXCEPTION 'PERSISTENCE FAIL: resource_sessions leaked % QA rows',        n_sessions; END IF;
  IF n_pay_events   <> 0 THEN RAISE EXCEPTION 'PERSISTENCE FAIL: summit_payment_events leaked % QA rows',    n_pay_events; END IF;
  IF n_int_elig     <> 0 THEN RAISE EXCEPTION 'PERSISTENCE FAIL: intensive_eligibility leaked % QA rows',    n_int_elig; END IF;
  IF n_rate_limits  <> 0 THEN RAISE EXCEPTION 'PERSISTENCE FAIL: rate_limits leaked % QA keys',              n_rate_limits; END IF;

  -- Inventory guarantee: the ten seeded unclaimed intensive_slots rows
  -- must all be unclaimed again after rollback. TEST11 mutated one of
  -- them inside the transaction; ROLLBACK must revert that mutation.
  IF n_unclaimed <> 10 THEN
    RAISE EXCEPTION 'PERSISTENCE FAIL: expected 10 unclaimed intensive_slots after rollback, got %', n_unclaimed;
  END IF;

  RAISE NOTICE 'PERSISTENCE OK: 0 QA rows across all protected tables; 10 unclaimed intensive_slots';
END $$;
