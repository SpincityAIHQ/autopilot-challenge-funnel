-- scripts/verify-resource-sessions.sql
--
-- Transaction-safe QA verification of the access-token / session /
-- entitlement pipeline. Seeds unique QA-only rows, asserts every
-- invariant, then ROLLBACK. Nothing persists.
--
-- Run with:
--   psql -v ON_ERROR_STOP=1 -f scripts/verify-resource-sessions.sql
--
-- Any failed assertion aborts the transaction (ON_ERROR_STOP=1) and the
-- rollback still leaves zero QA rows behind because the whole run is
-- wrapped in a single BEGIN/ROLLBACK.

\set ON_ERROR_STOP on
\timing off

BEGIN;

-- ---------------------------------------------------------------------
-- Seed unique QA identifiers so parallel runs cannot collide.
-- ---------------------------------------------------------------------
\set qa_email       '\'qa+verify@nuamenti.test\''
\set qa_tok_ga      '\'qa_hash_ga_'    || substring(md5(random()::text),1,16) || '\''
\set qa_tok_vault   '\'qa_hash_vault_' || substring(md5(random()::text),1,16) || '\''
\set qa_tok_expired '\'qa_hash_exp_'   || substring(md5(random()::text),1,16) || '\''
\set qa_tok_revoked '\'qa_hash_rev_'   || substring(md5(random()::text),1,16) || '\''
\set qa_sess_a      '\'qa_sess_a_'     || substring(md5(random()::text),1,16) || '\''
\set qa_sess_b      '\'qa_sess_b_'     || substring(md5(random()::text),1,16) || '\''
\set qa_sess_multi  '\'qa_sess_m_'     || substring(md5(random()::text),1,16) || '\''
\set qa_sess_vault  '\'qa_sess_v_'     || substring(md5(random()::text),1,16) || '\''
\set qa_pay_ga      '\'qa_pay_ga_'     || substring(md5(random()::text),1,16) || '\''
\set qa_pay_vault   '\'qa_pay_vault_'  || substring(md5(random()::text),1,16) || '\''
\set qa_pay_vipup   '\'qa_pay_vipup_'  || substring(md5(random()::text),1,16) || '\''

-- Entitlements: GA + Vault owned by the same buyer (independent scopes).
INSERT INTO public.entitlements (buyer_email, product)
VALUES (:qa_email, 'ga'), (:qa_email, 'vault');

-- Live tokens (unrevoked, unexpired) for GA and Vault.
INSERT INTO public.access_tokens (token_hash, buyer_email, scope, expires_at)
VALUES
  (:qa_tok_ga,    :qa_email, 'ga',    now() + interval '1 hour'),
  (:qa_tok_vault, :qa_email, 'vault', now() + interval '1 hour');

-- Expired token.
INSERT INTO public.access_tokens (token_hash, buyer_email, scope, expires_at)
VALUES (:qa_tok_expired, :qa_email, 'ga', now() - interval '1 hour');

-- Explicitly revoked token (still unexpired, still unused).
INSERT INTO public.access_tokens (token_hash, buyer_email, scope, expires_at, revoked_at)
VALUES (:qa_tok_revoked, :qa_email, 'ga', now() + interval '1 hour', now());

-- ---------------------------------------------------------------------
-- 1. First exchange of a live token succeeds and returns active scopes.
-- ---------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.exchange_access_token(
    _token_hash := current_setting('qa.tok_ga'),
    _session_hash := current_setting('qa.sess_a'),
    _ttl_seconds := 3600
  );
  IF r.buyer_email IS NULL THEN RAISE EXCEPTION 'TEST1 FAIL: no row'; END IF;
  IF NOT (r.scopes @> ARRAY['ga','vault']) THEN
    RAISE EXCEPTION 'TEST1 FAIL: scopes = %', r.scopes;
  END IF;
  RAISE NOTICE 'TEST1 PASS: first exchange returns scopes %', r.scopes;
END $$;

-- Bridge the psql \set values into GUCs the DO blocks can read.
SELECT set_config('qa.tok_ga',      :qa_tok_ga,      true);
SELECT set_config('qa.tok_vault',   :qa_tok_vault,   true);
SELECT set_config('qa.tok_expired', :qa_tok_expired, true);
SELECT set_config('qa.tok_revoked', :qa_tok_revoked, true);
SELECT set_config('qa.sess_a',      :qa_sess_a,      true);
SELECT set_config('qa.sess_b',      :qa_sess_b,      true);
SELECT set_config('qa.sess_multi',  :qa_sess_multi,  true);
SELECT set_config('qa.sess_vault',  :qa_sess_vault,  true);
SELECT set_config('qa.email',       :qa_email,       true);

-- Re-run TEST1 now that GUCs are populated (the DO above ran before GUCs;
-- redo authoritatively).
ROLLBACK;
BEGIN;

-- Re-seed after the reset. This time set GUCs BEFORE any DO block.
\set qa_email       '\'qa+verify@nuamenti.test\''
\set qa_tok_ga      '\'qa_hash_ga_'    || substring(md5(random()::text),1,16) || '\''
\set qa_tok_vault   '\'qa_hash_vault_' || substring(md5(random()::text),1,16) || '\''
\set qa_tok_expired '\'qa_hash_exp_'   || substring(md5(random()::text),1,16) || '\''
\set qa_tok_revoked '\'qa_hash_rev_'   || substring(md5(random()::text),1,16) || '\''
\set qa_sess_a      '\'qa_sess_a_'     || substring(md5(random()::text),1,16) || '\''
\set qa_sess_multi  '\'qa_sess_m_'     || substring(md5(random()::text),1,16) || '\''
\set qa_sess_vault  '\'qa_sess_v_'     || substring(md5(random()::text),1,16) || '\''

SELECT set_config('qa.email',       :qa_email,       true);
SELECT set_config('qa.tok_ga',      :qa_tok_ga,      true);
SELECT set_config('qa.tok_vault',   :qa_tok_vault,   true);
SELECT set_config('qa.tok_expired', :qa_tok_expired, true);
SELECT set_config('qa.tok_revoked', :qa_tok_revoked, true);
SELECT set_config('qa.sess_a',      :qa_sess_a,      true);
SELECT set_config('qa.sess_multi',  :qa_sess_multi,  true);
SELECT set_config('qa.sess_vault',  :qa_sess_vault,  true);

INSERT INTO public.entitlements (buyer_email, product)
VALUES (:qa_email, 'ga'), (:qa_email, 'vault');

INSERT INTO public.access_tokens (token_hash, buyer_email, scope, expires_at)
VALUES
  (:qa_tok_ga,      :qa_email, 'ga',    now() + interval '1 hour'),
  (:qa_tok_vault,   :qa_email, 'vault', now() + interval '1 hour'),
  (:qa_tok_expired, :qa_email, 'ga',    now() - interval '1 hour');
INSERT INTO public.access_tokens (token_hash, buyer_email, scope, expires_at, revoked_at)
VALUES (:qa_tok_revoked, :qa_email, 'ga', now() + interval '1 hour', now());

-- TEST 1: first exchange succeeds; scopes include both GA and Vault.
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.exchange_access_token(
    current_setting('qa.tok_ga'),
    current_setting('qa.sess_a'),
    3600
  );
  IF r.buyer_email IS NULL THEN RAISE EXCEPTION 'TEST1 FAIL'; END IF;
  IF NOT (r.scopes @> ARRAY['ga','vault']) THEN
    RAISE EXCEPTION 'TEST1 FAIL scopes=%', r.scopes;
  END IF;
  RAISE NOTICE 'TEST1 PASS first-exchange scopes=%', r.scopes;
END $$;

-- TEST 2: reusing the same magic token FAILS (single-use).
DO $$
BEGIN
  BEGIN
    PERFORM public.exchange_access_token(
      current_setting('qa.tok_ga'),
      current_setting('qa.sess_a') || '_x',
      3600
    );
    RAISE EXCEPTION 'TEST2 FAIL: reuse unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT ILIKE '%token not exchangeable%' THEN
      RAISE EXCEPTION 'TEST2 FAIL wrong error: %', SQLERRM;
    END IF;
    RAISE NOTICE 'TEST2 PASS reuse rejected: %', SQLERRM;
  END;
END $$;

-- TEST 3: expired token fails.
DO $$
BEGIN
  BEGIN
    PERFORM public.exchange_access_token(
      current_setting('qa.tok_expired'),
      current_setting('qa.sess_a') || '_exp',
      3600
    );
    RAISE EXCEPTION 'TEST3 FAIL: expired unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT ILIKE '%token not exchangeable%' THEN
      RAISE EXCEPTION 'TEST3 FAIL wrong error: %', SQLERRM;
    END IF;
    RAISE NOTICE 'TEST3 PASS expired rejected';
  END;
END $$;

-- TEST 4: explicitly revoked token fails.
DO $$
BEGIN
  BEGIN
    PERFORM public.exchange_access_token(
      current_setting('qa.tok_revoked'),
      current_setting('qa.sess_a') || '_rev',
      3600
    );
    RAISE EXCEPTION 'TEST4 FAIL: revoked unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT ILIKE '%token not exchangeable%' THEN
      RAISE EXCEPTION 'TEST4 FAIL wrong error: %', SQLERRM;
    END IF;
    RAISE NOTICE 'TEST4 PASS revoked rejected';
  END;
END $$;

-- TEST 5: fresh session via the second live token returns BOTH scopes.
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.exchange_access_token(
    current_setting('qa.tok_vault'),
    current_setting('qa.sess_multi'),
    3600
  );
  IF NOT (r.scopes @> ARRAY['ga','vault']) THEN
    RAISE EXCEPTION 'TEST5 FAIL scopes=%', r.scopes;
  END IF;
  RAISE NOTICE 'TEST5 PASS multi-scope session scopes=%', r.scopes;
END $$;

-- TEST 6: revoking the GA entitlement removes GA from the live session's
-- CURRENT scopes; Vault stays.
UPDATE public.entitlements
  SET revoked_at = now()
  WHERE buyer_email = current_setting('qa.email') AND product = 'ga';
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.session_active_scopes(current_setting('qa.sess_multi'));
  IF 'ga' = ANY(r.scopes) THEN
    RAISE EXCEPTION 'TEST6 FAIL: revoked GA still visible: %', r.scopes;
  END IF;
  IF NOT ('vault' = ANY(r.scopes)) THEN
    RAISE EXCEPTION 'TEST6 FAIL: vault missing after ga revoke: %', r.scopes;
  END IF;
  RAISE NOTICE 'TEST6 PASS post-revoke scopes=%', r.scopes;
END $$;

-- Reactivate GA for TEST 7.
UPDATE public.entitlements
  SET revoked_at = NULL
  WHERE buyer_email = current_setting('qa.email') AND product = 'ga';

-- TEST 7: seed a GA admission registration + separate Vault purchase,
-- then reverse ONLY the Vault. GA must survive.
INSERT INTO public.summit_registrations
  (full_name, email, phone, tier, admission_product, amount_cents, currency,
   commas_payment_id, status, payment_status)
VALUES ('QA GA', current_setting('qa.email'), NULL, 'ga', 'ga',
        2200, 'USD', :qa_pay_ga, 'confirmed', 'confirmed');

INSERT INTO public.summit_vault_purchases
  (registration_id, buyer_email, amount_cents, currency, commas_payment_id, payment_status)
VALUES ((SELECT id FROM public.summit_registrations
          WHERE commas_payment_id = :qa_pay_ga),
        current_setting('qa.email'), 19900, 'USD',
        :qa_pay_vault, 'confirmed');

DO $$
BEGIN
  PERFORM public.reverse_summit_payment(current_setting('qa.pay_vault'));
  IF NOT EXISTS (
    SELECT 1 FROM public.entitlements
     WHERE buyer_email = current_setting('qa.email')
       AND product = 'ga' AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'TEST7 FAIL: GA revoked by vault refund';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.entitlements
     WHERE buyer_email = current_setting('qa.email')
       AND product = 'vault' AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'TEST7 FAIL: vault entitlement still active after refund';
  END IF;
  RAISE NOTICE 'TEST7 PASS vault refund preserves GA';
END $$;
SELECT set_config('qa.pay_vault', :qa_pay_vault, true);
SELECT set_config('qa.pay_ga',    :qa_pay_ga,    true);
SELECT set_config('qa.pay_vipup', :qa_pay_vipup, true);

-- TEST 8: VIP-upgrade refund preserves the underlying GA admission
-- (registration downgrades back to GA; ga entitlement stays; vip revoked).
INSERT INTO public.summit_vip_upgrades
  (registration_id, buyer_email, amount_cents, currency, commas_payment_id, payment_status)
VALUES ((SELECT id FROM public.summit_registrations
          WHERE commas_payment_id = current_setting('qa.pay_ga')),
        current_setting('qa.email'), 5500, 'USD',
        current_setting('qa.pay_vipup'), 'confirmed');

UPDATE public.summit_registrations
  SET tier = 'vip'
  WHERE commas_payment_id = current_setting('qa.pay_ga');

INSERT INTO public.entitlements (buyer_email, product)
VALUES (current_setting('qa.email'), 'vip')
ON CONFLICT (buyer_email, product) DO UPDATE SET revoked_at = NULL;

DO $$
BEGIN
  PERFORM public.reverse_summit_payment(current_setting('qa.pay_vipup'));
  IF NOT EXISTS (
    SELECT 1 FROM public.entitlements
     WHERE buyer_email = current_setting('qa.email')
       AND product = 'ga' AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'TEST8 FAIL: GA revoked by VIP-upgrade refund';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.entitlements
     WHERE buyer_email = current_setting('qa.email')
       AND product = 'vip' AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'TEST8 FAIL: VIP still active after upgrade refund';
  END IF;
  RAISE NOTICE 'TEST8 PASS vip-upgrade refund preserves GA';
END $$;

-- Confirm the QA rows exist WITHIN this transaction (they should).
SELECT 'in-txn access_tokens' AS what, count(*) AS n
  FROM public.access_tokens WHERE buyer_email = current_setting('qa.email');

ROLLBACK;

-- Post-rollback: zero QA rows must persist.
SELECT 'persisted access_tokens' AS what,
       count(*)                    AS n
  FROM public.access_tokens
  WHERE buyer_email = 'qa+verify@nuamenti.test';

SELECT 'persisted registrations'  AS what,
       count(*)                    AS n
  FROM public.summit_registrations
  WHERE email = 'qa+verify@nuamenti.test';
