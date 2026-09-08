# AI AutoPilot payment and access go-live runbook

**Decision:** **HOLD** paid checkout and paid acquisition until every P0 gate in this runbook has a dated owner and evidence link. The application has the right fail-closed shape, but the production automation has not yet proved a complete payment-to-access journey.

**Release path:** HOLD → repair → controlled proof → GO. Do not call the system live because a webhook returned `200`, GHL accepted a request, or a checkout completed. GO means the buyer received and redeemed the correct access, the app enforced it, and a refund or cancellation removed it.

## Scope and non-negotiable contract

This runbook covers the free and paid journeys across three isolated scheduler lanes:

1. **Free training:** Autopilot waiting-list form → `training_waitlist` → `academy_outbox` → authenticated scheduler → GHL training-access workflow.
2. **Paid access:** Shopify checkout → signed Shopify webhook → `academy_commerce_receipts` → authenticated scheduler → Shopify Admin API reconciliation → `academy_orders` / `academy_grants` → access code → `academy_access_deliveries` → dedicated transactional GHL workflow → same-email sign-in and redemption → server-authorized lessons.

The source-of-truth rules are:

- Shopify's reconciled order state is the purchase source of truth. A success URL, browser query string, GHL tag, contact field, email receipt, or webhook payload alone never creates access.
- The app's active grant plus an unexpired, redeemed access-code record is the authorization source of truth. GHL delivers a code; it never grants access.
- Every inbound Shopify event is stored before it is processed. Every intended GHL action is stored before it is sent.
- Access starts only on redemption under the approved tier terms. The account email must equal the normalized Shopify order email.
- Checkout stays closed unless the full commerce-readiness gate passes. Existing buyers must still be able to sign in and redeem while new sales are paused.
- No ads or scaled traffic start until the four-tier golden path and the revocation tests pass.

> **Important product-model boundary:** the current GA, VIP, Vault, and Accelerator products are **one-time purchases with fixed access terms**. They are not subscriptions. The current code has no recurring billing contract, renewal webhook handling, billing-period extension, dunning, failed-renewal grace policy, plan change, or subscription cancellation lifecycle. Do not advertise or report “subscribers,” MRR, or recurring access until those capabilities are designed, implemented, and tested separately.

## Current evidence and blockers

Status below reflects the September 8, 2026 launch audit. Replace each item with a fresh, linked production receipt as it is repaired.

| Severity | Finding                                                                                       | Current evidence                                                                                                                                                                                                      | Exit condition                                                                                                                                                                                               | Owner    | Evidence / date |
| -------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------- |
| P0       | Production Shopify fulfillment is disabled or incomplete.                                     | An invalid-signature request to the deployed Shopify webhook returned `503 Not enabled`, not the expected `401 Invalid signature`.                                                                                    | With the integration enabled, invalid HMAC returns 401; a correctly signed event records a durable receipt; a real order reconciles.                                                                         | **\_\_** | **\_\_**        |
| P0       | Scheduled processing is not operating.                                                        | The live database showed 130 failed cron runs and two pending outbox rows with zero attempts. Earlier cron SQL called the wrong function.                                                                             | Three bounded, lane-isolated five-minute jobs use `net.http_post`; each has three consecutive successful runs; all eligible pending rows advance.                                                            | **\_\_** | **\_\_**        |
| P0       | Production capabilities were committed to Git.                                                | A tracked environment file and earlier migration contained a live GHL capability URL and scheduler bearer. Removing them from the latest tree does not revoke Git history.                                            | Provider-side rotation is complete, the old capabilities fail, the new values exist only in approved secret stores, and secret scanning is clean.                                                            | **\_\_** | **\_\_**        |
| P0       | Payment gateway availability is unproved.                                                     | Earlier operating context reported Shopify Payments disabled; this was not independently verified by the app audit.                                                                                                   | Shopify owner records the active approved gateway and one successful production authorization/capture. If Shopify cannot collect payment, reroute to an approved processor before reopening checkout.        | **\_\_** | **\_\_**        |
| P0       | Amount, currency, and discount enforcement is implemented locally but unproved in production. | The repair branch checks each line's discounted shop-money and buyer-presentment totals against the exact approved USD amount; discounts, currency mismatches, and mixed/unmapped lines cannot produce usable access. | Deploy the validated Admin query and prove exact-price success plus discounted and non-USD rejection on production-connected orders.                                                                         | **\_\_** | **\_\_**        |
| P0       | No production payment-to-redemption receipt exists for all four tiers.                        | Local tests and configured product URLs are not live fulfillment evidence.                                                                                                                                            | GA, VIP, Vault, and Accelerator each pass the golden path below with unique buyers/orders and linked receipts.                                                                                               | **\_\_** | **\_\_**        |
| P0       | GHL delivery semantics and suppression are unproved.                                          | The app can queue separate general and access events, but provider-side idempotency, consent branches, code privacy, and purchase suppression have not been witnessed.                                                | Duplicate events create one action; consent branches behave correctly; transactional code delivery works without marketing consent; no SMS is sent without SMS consent; purchased users leave sales nurture. | **\_\_** | **\_\_**        |
| P0       | Bounded queue repair is implemented locally but unproved in production.                       | The repair branch isolates three scheduler lanes, claims one unit per lane, applies leases/backoff, coalesces older same-order receipts after a current Shopify read, and quarantines ambiguous sends.                | Apply the queue/recovery migrations; prove a poison or duplicate receipt cannot starve a valid order; prove bounded same-ID retries and visible terminal states for both GHL lanes.                          | **\_\_** | **\_\_**        |
| P1       | Unknown and partial states require operator ownership.                                        | Unknown variants, missing email, quantity above one, and partial refunds can require review; a provider timeout can leave delivery `unknown`.                                                                         | Studio queues have a named owner, response SLA, and tested resolution procedure. No `unknown`, failed, or review row silently grants access.                                                                 | **\_\_** | **\_\_**        |
| P1       | Revoked users may retain an already issued signed media URL briefly.                          | Paid media URLs can remain valid until their one-hour signature expires.                                                                                                                                              | Risk is accepted for launch or media delivery is changed to support immediate revocation. UI/API access must revoke immediately.                                                                             | **\_\_** | **\_\_**        |

## Roles and evidence standard

Assign one person to each role before touching production. One person may hold several roles, but no release is self-approved without a second reviewer for payment and access.

| Role                 | Name     | Responsibility                                                                                                    | Sign-off evidence                           |
| -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Executive owner      | **\_\_** | Accepts product terms, gateway, refund policy, and launch decision.                                               | Dated decision link                         |
| Release manager      | **\_\_** | Controls flags, deployment sequence, change log, HOLD/GO call, and rollback.                                      | Release record and version/commit           |
| App engineer         | **\_\_** | Commerce gate, webhook endpoint, reconciliation, code issuance, redemption, and revocation.                       | Test run plus deployment receipt            |
| Supabase operator    | **\_\_** | Migrations, Vault, cron, RLS/service-role boundaries, queue health, and evidence queries.                         | Migration list and redacted query export    |
| Shopify owner        | **\_\_** | App token/scopes, active gateway, products/variants, webhook subscriptions, payments, refunds, and cancellations. | Shopify screenshots/IDs, no secrets         |
| GHL owner            | **\_\_** | General and transactional workflows, event dedupe, consent, suppression, delivery logs, and code privacy.         | Workflow version and redacted execution log |
| QA buyer             | **\_\_** | Uses controlled inboxes and runs the four golden paths plus negatives.                                            | Screen recording and test ledger            |
| Support owner        | **\_\_** | Owns `needs_review`, `unknown`, failed delivery, wrong-email, and refund cases.                                   | Queue SLA and escalation route              |
| Independent reviewer | **\_\_** | Confirms evidence and makes the final GO recommendation.                                                          | Signed release checklist                    |

Acceptable evidence includes a redacted Shopify order page, webhook delivery ID, database row ID/status, cron run ID, GHL execution ID, email screenshot with the code obscured, redemption event, authorized/denied API result, and a short screen recording. Never place tokens, bearer values, HMAC values, access codes, full service-role keys, or full GHL hook URLs in tickets, recordings, screenshots, or logs.

## Production environment contract

The names below are taken from the current application code. Secret-bearing runtime configuration belongs in the deployment provider's encrypted server environment. Never restore `.env` to Git. A tracked `.env.production` is acceptable only while every entry is an intentionally browser-public `VITE_` value; CI/review must reject any server variable or capability URL added to it.

### Supabase and public form

| Variable                        | Location                  | Required behavior                                                                            |
| ------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`                  | Server                    | Production project URL used by server routes and reconciliation.                             |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server secret             | Service-role access for durable queue and commerce operations; never exposed to the browser. |
| `VITE_SUPABASE_URL`             | Client-safe build setting | Production project URL used for browser authentication.                                      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client-safe build setting | Publishable/anon browser key, never a service-role key.                                      |
| `RATE_LIMIT_HMAC_SECRET`        | Server secret             | Required for the public training waiting-list endpoint's rate limiter.                       |

### Shopify, grant, and scheduler

| Variable                          | Required value class                                   | Gate                                                                               |
| --------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `ACADEMY_SHOPIFY_ENABLED`         | `true` only during controlled proof/GO                 | Signed webhook receiver                                                            |
| `ACADEMY_COMMERCE_SCHEMA_VERSION` | `2026-09-08.2` only after all listed migrations pass   | Prevents checkout before the required database schema is active                    |
| `ACADEMY_SHOPIFY_SHOP`            | Exact lowercase `*.myshopify.com` shop domain          | Shop header and Admin API host                                                     |
| `SHOPIFY_ADMIN_ACCESS_TOKEN`      | Server-side Admin API token                            | Authoritative order reconciliation                                                 |
| `ACADEMY_SHOPIFY_WEBHOOK_SECRET`  | Current Shopify webhook signing secret                 | Raw-body HMAC verification                                                         |
| `ACADEMY_SCHEDULER_SECRET`        | New random server bearer, at least 32 characters       | Authenticates `/api/academy/process-integrations`                                  |
| `ACADEMY_PAID_ACCESS_ENABLED`     | `true` only after terms/media/revocation QA            | Server lesson authorization                                                        |
| `ACADEMY_ACCESS_CODES_ENABLED`    | `true` only after code/redeem QA                       | Code issuance and redemption                                                       |
| `ACADEMY_ACCESS_CODE_SECRET`      | Dedicated random server secret, at least 32 characters | Deterministic code generation                                                      |
| `ACADEMY_ACCESS_TERMS_JSON`       | Approved JSON for all four tiers                       | Each tier requires integer `hours`, `starts:"redemption"`, and non-empty `version` |
| `ACADEMY_ACCESS_EMAIL_ENABLED`    | `true` only after transactional workflow proof         | Access-delivery worker                                                             |

`ACADEMY_ACCESS_TERMS_JSON` must contain explicit entries for `ga`, `vip`, `vault`, and `accelerator`. Product/legal owner approval is required; do not invent durations. Do not rotate `ACADEMY_ACCESS_CODE_SECRET` while an unredeemed code exists. If rotation is necessary, first implement a key-version and controlled reissue procedure.

The Academy catalogue currently maps Shopify variants to these tiers. Shopify owner and app engineer must compare the live product/variant records to the deployed code at every product change:

| Tier        | Shopify variant ID expected by the app | Current public product                      |
| ----------- | -------------------------------------: | ------------------------------------------- |
| GA          |                       `50980696129783` | AI AutoPilot Summit General Admission       |
| VIP         |                       `50980697571575` | AI AutoPilot Summit VIP                     |
| Vault       |                       `50980698194167` | AI AutoPilot Summit VIP + Emerald Vault Key |
| Accelerator |                       `51080447492343` | Q4 AI Accelerator                           |

### GHL

| Variable                          | Purpose                                                                                           | Consent boundary                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ACADEMY_GHL_ENABLED`             | Enables processing of general Academy outbox events.                                              | Only turn on after workflow test and dedupe proof.                                                                         |
| `ACADEMY_GHL_WEBHOOK_URL`         | Dedicated inbound workflow for `training_waitlist_joined`, webinar, and optional learning events. | A training-access notice may be sent for the explicit request. Ongoing marketing/learning sends require marketing consent. |
| `ACADEMY_GHL_ACCESS_WEBHOOK_URL`  | Separate transactional inbound workflow for `purchase_access_code`.                               | Does not require marketing consent; may deliver only the purchased access code.                                            |
| `ACADEMY_LEARNING_NUDGES_ENABLED` | Optional progress-based coaching queue.                                                           | Keep `false` until consent, eligibility recheck, timing, and suppression pass.                                             |

The URL variables are provider capabilities and must be treated as secrets even though they are URLs. Only `services.leadconnectorhq.com/hooks/...` is accepted by the current server. The general and transactional workflows must not share a hook.

## Phase 0 — Freeze and preserve

1. Release manager records the production version/commit, deployment ID, Supabase project reference, Shopify shop, and GHL workflow versions.
2. Pause paid ads, disable campaign destination checkout buttons, keep at least one commerce readiness flag false, and unpublish/draft the four Shopify products (or remove them from every customer-facing sales channel) so previously shared direct URLs cannot bypass the app's HOLD state.
3. Export counts, not secret values, for the current queues:

   ```sql
   select status, count(*) from public.academy_commerce_receipts group by status order by status;
   select needs_review, count(*) from public.academy_orders group by needs_review order by needs_review;
   select active, tier, count(*) from public.academy_grants group by active, tier order by tier, active;
   select status, count(*) from public.academy_access_deliveries group by status order by status;
   select status, name, count(*) from public.academy_outbox group by status, name order by name, status;
   ```

4. Record the two pending outbox rows and the failed cron history before repair. Do not delete or manually mark them delivered.
5. Confirm database backups and point-in-time recovery policy. Ordinary rollback must preserve orders, receipts, codes, events, and delivery history.

**Owner:** **\_\_** **Completed at:** **\_\_** **Evidence:** **\_\_**

## Phase 1 — Revoke and rotate exposed capabilities

Rotation happens at the providers, not by merely editing Git.

1. In GHL, replace every Academy inbound webhook URL that may have appeared in Git or logs. Disable/delete the old inbound triggers and verify an old URL can no longer start a workflow.
2. Generate a new dedicated scheduler bearer outside the repository. Store the same new value in:
   - the production server environment as `ACADEMY_SCHEDULER_SECRET`; and
   - Supabase Vault under the name `academy_scheduler_bearer`.
3. Store the deployed processing endpoint in Supabase Vault under `academy_integration_url`. Its path must be `/api/academy/process-integrations`, use HTTPS, and point to the production origin.
4. Audit Git history and deployment logs for `SHOPIFY_ADMIN_ACCESS_TOKEN`, `ACADEMY_SHOPIFY_WEBHOOK_SECRET`, `ACADEMY_ACCESS_CODE_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY`. Rotate at the relevant provider if any one was exposed. Do not rewrite published Git history as a launch fix; revocation is what removes authority.
5. If an access-code secret might have been exposed and any code exists, stop. Inventory outstanding and redeemed codes, design key-version migration/reissue, and notify affected buyers before rotation.
6. Redeploy once with commerce/GHL flags still off. Verify no server log prints environment values or inbound payload access codes.

**Pass evidence:** provider rotation receipts; redacted deployment-variable names; old capability rejection; secret-scan report.

**Owner:** **\_\_** **Completed at:** **\_\_** **Evidence:** **\_\_**

## Phase 2 — Repair Supabase Vault and cron

Use the Supabase Dashboard Vault UI or an approved secrets-managed SQL session. Supply secret values interactively; do not paste them into a migration, shell history, ticket, or this document.

1. Create or update exactly one Vault secret named `academy_integration_url`.
2. Create or update exactly one Vault secret named `academy_scheduler_bearer`.
3. Verify names and uniqueness without selecting decrypted values:

   ```sql
   select name, count(*)
   from vault.decrypted_secrets
   where name in ('academy_integration_url', 'academy_scheduler_bearer')
   group by name;
   ```

   Each name must return a count of `1`.

4. Review and apply the secure cron migration. The active migration must:
   - unschedule prior `academy-process-integrations`, `academy-process-commerce`, `academy-process-access`, and `academy-process-ghl` jobs;
   - read both capabilities from `vault.decrypted_secrets` at run time;
   - call `net.http_post`, not `extensions.http_post` or an unqualified legacy helper;
   - send `Authorization: Bearer …` without storing that value in `cron.job`; and
   - schedule three bounded jobs every five minutes—one each for commerce reconciliation, transactional access email, and general GHL delivery.
5. The secure jobs remain installed but inert if either Vault name is absent. Because each checks Vault at run time, adding both names activates the next scheduled run without another migration. Never paste a bearer into a cron command.
6. Verify the job definitions without selecting their command text:

   ```sql
   select jobid, jobname, schedule, active
   from cron.job
   where jobname in ('academy-process-commerce', 'academy-process-access', 'academy-process-ghl')
   order by jobname;
   ```

   Expected: exactly three rows, each with schedule `*/5 * * * *` and active `true`.

7. Watch at least three consecutive executions:

   ```sql
   select jobid, runid, status, return_message, start_time, end_time
   from cron.job_run_details
   where jobid in (
     select jobid
     from cron.job
     where jobname in ('academy-process-commerce', 'academy-process-access', 'academy-process-ghl')
   )
   order by start_time desc
   limit 10;
   ```

8. Confirm the endpoint returns authenticated `200` JSON to cron, and an unauthenticated request returns `401 Unauthorized`. Do not place the bearer in a command captured by shell history.
9. Confirm eligible pending rows advance. A row that stays `pending`, `unknown`, or `failed` requires investigation; do not update it by hand merely to make the dashboard green.
10. Verify the commerce/access queue migration is applied. Put one controlled unreconcilable receipt ahead of one valid receipt; the invalid row must back off and ultimately become `failed` without preventing the valid row from reconciling.
11. Only after the migration and queue tests pass, set `ACADEMY_COMMERCE_SCHEMA_VERSION=2026-09-08.2`. A mismatch must keep checkout disabled.

Each scheduled request claims one unit. Shopify and GHL outbound calls use five-second request limits. A Shopify order with more than 250 line items is not paginated inside the cron request: every visible grant is disabled and the order enters manual review. After a successful current Shopify read, only older `pending`/`retry` receipts for that same order are coalesced; receipts that arrived after the worker lease remain queued.

**Pass evidence:** applied migration/version; three cron rows; three successful run IDs per lane; before/after queue counts; redacted `200` responses.

**Owner:** **\_\_** **Completed at:** **\_\_** **Evidence:** **\_\_**

## Phase 3 — Configure and prove Shopify

### 3.1 Gateway, app, and product controls

1. Shopify owner verifies the production shop can collect and settle funds through an approved active gateway. Record gateway status and a production capture ID; do not record banking details.
2. Install/verify the Admin API app with the minimum scopes required by the validated query, including `read_orders` and `read_products`, plus any Shopify-required equivalent scopes for the shop's order types. Store its current token only as `SHOPIFY_ADMIN_ACCESS_TOKEN` in the server secret store.
3. Confirm `ACADEMY_SHOPIFY_SHOP` exactly matches Shopify's webhook shop-domain header.
4. Compare all four live variant IDs to the table above. A product edit that creates a new variant requires a reviewed code change before sales.
5. Deploy and production-prove the implemented Admin API reconciliation policy. It verifies:
   - expected product and variant;
   - exactly one purchased and one current unit;
   - paid/captured state and non-test order;
   - approved currency;
   - approved collected amount; and
   - the current discount policy: no automatic access when the discounted total differs from the exact approved price.

   Missing, underpaid, over-quantity, test, unmapped, or disallowed-discount orders must produce no code and a visible review state.

### 3.2 Webhook subscriptions

Subscribe the production app to the canonical endpoint:

`https://aiautopilotsummit.com/api/public/webhooks/shopify`

Required topics:

- `orders/paid`
- `orders/updated`
- `orders/cancelled`
- `refunds/create`

Use the same current signing secret represented by `ACADEMY_SHOPIFY_WEBHOOK_SECRET`. Pin reconciliation to Admin GraphQL API `2026-07` until a deliberate version upgrade is tested.

### 3.3 Webhook acceptance checks

Run these in production before allowing a real buyer:

| Test                                | Expected HTTP result      | Expected durable result                            | Owner    | Evidence |
| ----------------------------------- | ------------------------- | -------------------------------------------------- | -------- | -------- |
| Missing/incorrect HMAC              | `401 Invalid signature`   | No receipt                                         | **\_\_** | **\_\_** |
| Correct HMAC, wrong shop domain     | `403 Wrong shop`          | No receipt                                         | **\_\_** | **\_\_** |
| Unsupported topic                   | `200 Ignored`             | No grant                                           | **\_\_** | **\_\_** |
| Malformed JSON with valid signature | `400 Invalid body`        | No receipt/grant                                   | **\_\_** | **\_\_** |
| Correct supported event             | `200 Recorded`            | One pending receipt keyed by Shopify event ID      | **\_\_** | **\_\_** |
| Same event delivered twice          | `200 Recorded` both times | One receipt, one reconciliation, one code/delivery | **\_\_** | **\_\_** |

`200 Recorded` means the event was durably received, not that access exists. The authenticated scheduler must reconcile the order through Admin GraphQL before any grant or code is issued.

**Owner:** **\_\_** **Completed at:** **\_\_** **Evidence:** **\_\_**

## Phase 4 — Configure and prove GHL

Create two versioned inbound workflows. Record their names and versions, not their capability URLs.

### General/training workflow

Input hook: `ACADEMY_GHL_WEBHOOK_URL`.

- Deduplicate on immutable `event_id`; also accept the identical `X-Academy-Event-Id` header as the trace ID.
- `training_waitlist_joined` with purpose `training_access_request` may send the single notice the person explicitly requested.
- `marketing_consent: false` must not enroll the contact in an ongoing campaign, promotional branch, or learning-nudge branch.
- Learning events require current marketing consent; app eligibility is rechecked immediately before dispatch. GHL must also honor unsubscribe, do-not-contact, and suppression state.
- Phone is `null` and `sms_consent` is `false` for the public training request. Never infer SMS consent from an email submission.
- When a person purchases or begins the training, remove/suppress incompatible sales and “not started” messages. Never keep pitching a tier the contact already owns.

### Transactional access workflow

Input hook: `ACADEMY_GHL_ACCESS_WEBHOOK_URL`.

- Accept only `purchase_access_code` with purpose `transactional`.
- Deduplicate on immutable `event_id` before any email step. A retry or duplicate inbound request must create one email, not a second code delivery.
- Deliver to the event email only. Do not search for and substitute another contact address.
- Use the supplied tier, expiry, access term, and `/redeem` URL. Do not calculate or extend access in GHL.
- Never store the full access code in a reusable contact-wide custom field, opportunity, note, analytics property, or plaintext workflow log. Use it only in the transactional message context and redact execution logs.
- Transactional access does not require marketing consent and must not add marketing consent, tags, nurture, SMS, or sales tasks.
- A 2xx response means GHL accepted the event; it does not prove inbox delivery. Preserve the GHL execution/message ID for support evidence.

### Required GHL tests

| Scenario                                 | Expected result                                                                                           | Owner    | Evidence |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------- | -------- |
| Same `event_id` posted twice             | One workflow execution/action and one email                                                               | **\_\_** | **\_\_** |
| Training request, marketing off          | One requested access notice; no nurture                                                                   | **\_\_** | **\_\_** |
| Training request, marketing on           | Access notice plus only the approved email branch                                                         | **\_\_** | **\_\_** |
| No SMS consent                           | No text, phone workflow, or SMS task                                                                      | **\_\_** | **\_\_** |
| Purchase, marketing off                  | Transactional access email still sent; no marketing enrollment                                            | **\_\_** | **\_\_** |
| Purchase while in sales nurture          | Owned-tier sales sequence is removed/suppressed                                                           | **\_\_** | **\_\_** |
| GHL 429/5xx response                     | Stable `event_id` receives bounded exponential-backoff retries; provider dedupe still produces one action | **\_\_** | **\_\_** |
| Network timeout/disconnect after request | App records `unknown`; operator reconciles before any resend                                              | **\_\_** | **\_\_** |
| Invalid or missing event name            | Workflow rejects/no-ops and alerts owner                                                                  | **\_\_** | **\_\_** |

Only after this table passes should `ACADEMY_GHL_ENABLED` or `ACADEMY_ACCESS_EMAIL_ENABLED` become `true`. Keep `ACADEMY_LEARNING_NUDGES_ENABLED=false` until its separate timing/content review passes.

**Owner:** **\_\_** **Completed at:** **\_\_** **Evidence:** **\_\_**

## Phase 5 — Four-tier golden path

Run one isolated buyer/order per tier: GA, VIP, Vault, and Accelerator. Current code rejects Shopify test orders and discounted totals for automatic access, so neither is a valid golden-path receipt. Use an executive-approved controlled live purchase at the exact configured USD price and refund it through the normal tested path when appropriate. Never weaken the production policy merely to make a test pass.

Use a unique controlled inbox for each tier. The app account must be confirmed with the exact normalized order email.

| Checkpoint                                                                                         | GA  | VIP | Vault | Accelerator |
| -------------------------------------------------------------------------------------------------- | --- | --- | ----- | ----------- |
| Checkout shows approved product, price, currency, terms and refund policy                          | ☐   | ☐   | ☐     | ☐           |
| Approved gateway captures payment; Shopify order is non-test and paid                              | ☐   | ☐   | ☐     | ☐           |
| Supported signed webhook returns `200 Recorded`                                                    | ☐   | ☐   | ☐     | ☐           |
| One `academy_commerce_receipts` row exists for the event and becomes `reconciled`                  | ☐   | ☐   | ☐     | ☐           |
| Admin API snapshot matches buyer email, variant, amount/currency/discount policy, and quantity one | ☐   | ☐   | ☐     | ☐           |
| `academy_orders.needs_review = false`                                                              | ☐   | ☐   | ☐     | ☐           |
| Exactly one active grant with the expected tier exists                                             | ☐   | ☐   | ☐     | ☐           |
| Exactly one unredeemed, unexpired access code and delivery row exists                              | ☐   | ☐   | ☐     | ☐           |
| Dedicated GHL workflow accepts once and sends one redacted transactional email                     | ☐   | ☐   | ☐     | ☐           |
| Confirmed account signs in with the same Shopify order email                                       | ☐   | ☐   | ☐     | ☐           |
| `/redeem` accepts the code once and records `access_redeemed`                                      | ☐   | ☐   | ☐     | ☐           |
| Correct lessons/features authorize; the next tier remains denied                                   | ☐   | ☐   | ☐     | ☐           |
| Refresh/new device preserves server-authorized access                                              | ☐   | ☐   | ☐     | ☐           |
| Studio counts and queues match the underlying records with no unknown/review item                  | ☐   | ☐   | ☐     | ☐           |

Tier-specific authorization receipts:

- **GA:** Day 1 and Day 2 main lessons open; VIP, Vault, and Accelerator content remain locked.
- **VIP:** GA plus both VIP after-hours lessons open; Vault and Accelerator remain locked.
- **Vault:** GA/VIP, Emerald intensive, and Vault resources open; Accelerator remains locked.
- **Accelerator:** implementation lab, configured build-room replays, AI Spin/live-avatar gate, and the included booking page authorize only while active. Provider readiness for avatar and booking is a separate content/service gate.

Golden-path ledger:

| Tier        | QA buyer | Shopify order ID | Event/receipt ID | Grant/code delivery ID | GHL execution ID | Redeemed event ID | App proof | QA owner/date |
| ----------- | -------- | ---------------- | ---------------- | ---------------------- | ---------------- | ----------------- | --------- | ------------- |
| GA          | **\_\_** | **\_\_**         | **\_\_**         | **\_\_**               | **\_\_**         | **\_\_**          | **\_\_**  | **\_\_**      |
| VIP         | **\_\_** | **\_\_**         | **\_\_**         | **\_\_**               | **\_\_**         | **\_\_**          | **\_\_**  | **\_\_**      |
| Vault       | **\_\_** | **\_\_**         | **\_\_**         | **\_\_**               | **\_\_**         | **\_\_**          | **\_\_**  | **\_\_**      |
| Accelerator | **\_\_** | **\_\_**         | **\_\_**         | **\_\_**               | **\_\_**         | **\_\_**          | **\_\_**  | **\_\_**      |

## Phase 6 — Negative, refund, and cancellation matrix

Run every P0 case. Use separate orders where state changes would make evidence ambiguous.

| Scenario                                             | Required result                                                                           | Severity | Owner    | Evidence |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------: | -------- | -------- |
| Wrong account email redeems a valid code             | Rejected; no redeemed user or access period                                               |       P0 | **\_\_** | **\_\_** |
| Same code redeemed twice by another user             | Rejected; original entitlement unchanged                                                  |       P0 | **\_\_** | **\_\_** |
| Expired or regenerated old code                      | Rejected; no extension                                                                    |       P0 | **\_\_** | **\_\_** |
| Order has no email                                   | `needs_review`; no active usable access/code email                                        |       P0 | **\_\_** | **\_\_** |
| Unmapped variant                                     | `needs_review`; zero recognized grants; no code                                           |       P0 | **\_\_** | **\_\_** |
| Quantity above one                                   | `needs_review`; no usable access pending operator decision                                |       P0 | **\_\_** | **\_\_** |
| Shopify test order                                   | No active grant                                                                           |       P0 | **\_\_** | **\_\_** |
| Pending, authorized-only, voided, or failed payment  | No active grant/code                                                                      |       P0 | **\_\_** | **\_\_** |
| Wrong currency, underpayment, or disallowed discount | `needs_review`; no code                                                                   |       P0 | **\_\_** | **\_\_** |
| Duplicate paid webhook                               | One receipt per event ID and no duplicate grant, code, or email                           |       P0 | **\_\_** | **\_\_** |
| Webhooks delivered out of order                      | Latest Admin API state wins; no stale reactivation                                        |       P0 | **\_\_** | **\_\_** |
| Partial refund                                       | Order enters review; access is blocked pending approved policy                            |       P0 | **\_\_** | **\_\_** |
| Full refund                                          | Grant becomes inactive; API/lesson access is denied after reconciliation                  |       P0 | **\_\_** | **\_\_** |
| Order cancellation                                   | Grant becomes inactive; API/lesson access is denied after reconciliation                  |       P0 | **\_\_** | **\_\_** |
| Refund/cancel after redemption                       | Existing session cannot authorize paid content; no new code sends                         |       P0 | **\_\_** | **\_\_** |
| Refund/cancel event duplicated                       | Idempotent; no duplicate support/email action                                             |       P1 | **\_\_** | **\_\_** |
| Shopify Admin API timeout                            | Receipt remains pending; no speculative grant; queue alerts owner                         |       P0 | **\_\_** | **\_\_** |
| Poison receipt ahead of a valid order                | Poison row backs off/dead-letters; the later valid order still reconciles                 |       P0 | **\_\_** | **\_\_** |
| Scheduler bearer missing/wrong                       | `401`; no queue mutation                                                                  |       P0 | **\_\_** | **\_\_** |
| GHL returns 429/5xx                                  | Bounded retry/backoff with the same `event_id`; one provider action                       |       P1 | **\_\_** | **\_\_** |
| GHL outcome uncertain after attempted send           | Delivery `unknown`; operator reconciles before resend                                     |       P0 | **\_\_** | **\_\_** |
| Marketing consent withdrawn                          | Pending optional learning/marketing events cancel; transactional access remains available |       P0 | **\_\_** | **\_\_** |

For refund and cancellation tests, capture the time from Shopify state change to app denial. The target is one scheduler interval plus provider/API latency. Record the current one-hour signed-media URL limitation separately; it must not be mistaken for continued app authorization.

**Owner:** **\_\_** **Completed at:** **\_\_** **Evidence:** **\_\_**

## Phase 7 — Queue operations and support

The Studio page surfaces queue counts, but the database remains the detailed operational record.

| Queue/state                                   | Primary owner             | Initial response target | Operator action                                                                                                                                                                                                             |
| --------------------------------------------- | ------------------------- | ----------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pending Shopify receipt older than 10 minutes | App engineer              |              15 minutes | Inspect Admin API result, shop/token/scopes, order ID and cron run. Do not create a grant manually.                                                                                                                         |
| `academy_orders.needs_review = true`          | Shopify + support         |        4 business hours | Verify email, variant, quantity, amount/currency/discount and refund state. Resolve through a reviewed reconciliation path.                                                                                                 |
| Access delivery `unknown`                     | GHL + support             |         1 business hour | Search GHL by the exact event ID. If any workflow action/message exists, do not resend. If none exists, enter the non-secret provider reference in Studio, attest the check, and use the audited reconciled-unknown action. |
| Access delivery `failed`                      | App engineer + support    |         1 business hour | Correct the pre-send issue. Studio permits requeue only when the durable send-attempt marker proves no outbound attempt; the same event ID and access terms are retained.                                                   |
| General outbox `unknown`                      | GHL owner                 |        4 business hours | Reconcile workflow execution; do not blindly duplicate a marketing action.                                                                                                                                                  |
| Buyer says code missing                       | Support                   |        4 business hours | Confirm exact order email and active reconciled grant. Check the delivery state in Studio, then use only the matching audited recovery path; never read a code from logs.                                                   |
| Wrong-email purchase                          | Support + executive owner |          1 business day | Follow approved order-email correction/refund policy. Never bypass same-email redemption ad hoc.                                                                                                                            |

Daily during controlled rollout, record:

- pending/reconciled commerce receipts;
- orders needing review;
- active grants by tier;
- access deliveries by status;
- general outbox by event/status;
- median and maximum payment-to-email and payment-to-redemption time;
- refunds/cancellations and time-to-revocation; and
- support cases linked to an order and resolution receipt.

No one may “fix” a launch metric by deleting a receipt, code, delivery, order, or event row.

## GO decision

The independent reviewer may recommend GO only when every statement below is true:

- [ ] All P0 blockers have a dated owner and linked evidence.
- [ ] Exposed provider capabilities are revoked and replacements are absent from Git and logs.
- [ ] All three Vault-backed, lane-isolated `net.http_post` cron jobs have three consecutive successful runs.
- [ ] Production webhook rejects invalid HMAC with 401 and records correctly signed supported topics.
- [ ] Amount, currency, product/variant, quantity, payment status, and discount policy are enforced before grants.
- [ ] The approved gateway has a real capture receipt.
- [ ] The four Shopify products are republished to the intended sales channel only after the app gate and golden paths pass.
- [ ] GA, VIP, Vault, and Accelerator each passed the complete golden path.
- [ ] Wrong-email, duplicate, unmapped, quantity, underpayment, refund, cancellation, timeout, and consent cases passed.
- [ ] General and transactional GHL workflows deduplicate `event_id` and preserve consent boundaries.
- [ ] Commerce, access-delivery, and general GHL queues pass claim, lease, backoff, terminal-state, and no-starvation tests.
- [ ] Failed/no-send and provider-reconciled unknown access-email recovery both pass with an audit event; blind unknown/accepted resend is rejected.
- [ ] `needs_review`, pending, failed, and unknown queues are zero or each has an actively owned documented exception.
- [ ] Paid course media/content and explicit fixed access terms are approved for every tier.
- [ ] Support has the queue runbook, order lookup route, refund/cancel response, and same-email script.
- [ ] Current product copy says purchase/access, not subscription/recurring billing.
- [ ] Release manager and independent reviewer signed the deployment version below.

### Final sign-off

| Field                                     | Value     |
| ----------------------------------------- | --------- |
| Decision                                  | HOLD / GO |
| Production commit/version                 | **\_\_**  |
| Deployment ID                             | **\_\_**  |
| Supabase migration version                | **\_\_**  |
| Shopify app/webhook configuration version | **\_\_**  |
| GHL general workflow version              | **\_\_**  |
| GHL transactional workflow version        | **\_\_**  |
| Executive owner/date                      | **\_\_**  |
| Release manager/date                      | **\_\_**  |
| Independent reviewer/date                 | **\_\_**  |
| Evidence index                            | **\_\_**  |

## Controlled launch after GO

GO opens a controlled cohort, not immediate scale.

1. Allow five real buyers across the offer ladder while ads remain paused or tightly capped.
2. Review every purchase, receipt, delivery, redemption, denial, and support case daily.
3. Hold if any P0 recurs, if an unauthorized user gains access, if a paid user cannot redeem within the support SLA, or if refund/cancel access remains active beyond the accepted window.
4. Expand only after five consecutive real buyers complete payment-to-redemption without manual database intervention and revocation has been witnessed on a real controlled order.
5. Build recurring billing as a separate release before pursuing a subscription-user target. That release needs a subscription system of record, recurring payment events, entitlement-period rules, dunning/grace periods, upgrades/downgrades, cancellation-at-period-end, refunds/chargebacks, and corresponding GHL suppression tests.

## Rollback matrix

Rollback is feature-flag first. Preserve all durable records for reconciliation.

| Incident                                | Immediate safe action                                                                                                                                                           | Preserve                                 | Recovery gate                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| Payments/webhook integrity uncertain    | Set `ACADEMY_SHOPIFY_ENABLED=false`, pause ads, and unpublish/draft the four Shopify products or remove their customer-facing sales channel so old direct URLs cannot transact. | All receipts, orders and Shopify records | HMAC + Admin reconciliation + negative suite passes                            |
| Wrong grants or entitlement bypass      | Set `ACADEMY_PAID_ACCESS_ENABLED=false` and `ACADEMY_ACCESS_CODES_ENABLED=false`; declare customer-impact incident.                                                             | Grants, codes, events, order snapshots   | Root cause fixed; all affected orders reconciled; authorized regression passes |
| Access email leaking/duplicating codes  | Set `ACADEMY_ACCESS_EMAIL_ENABLED=false`; disable the GHL transactional workflow.                                                                                               | Delivery rows and GHL execution logs     | Code privacy/idempotency proof and affected-buyer plan                         |
| General GHL consent/suppression failure | Set `ACADEMY_GHL_ENABLED=false`; disable the general inbound workflow.                                                                                                          | Outbox rows and consent records          | Consent matrix and dedupe proof passes                                         |
| Learning-nudge defect only              | Set `ACADEMY_LEARNING_NUDGES_ENABLED=false`.                                                                                                                                    | Progress and queued events               | Content, eligibility and consent review passes                                 |
| Cron storm or bad endpoint              | Unschedule only `academy-process-commerce`, `academy-process-access`, and `academy-process-ghl`; leave queues durable.                                                          | Pending receipts/outbox/deliveries       | Three corrected bounded five-minute jobs and three successful runs per lane    |
| Shopify/GHL credential exposure         | Disable affected app/hook/token at provider, rotate in secret stores, keep commerce flags off.                                                                                  | Audit records without secret values      | Old capability rejected and secret scan clean                                  |

Do not drop tables, delete buyer history, mark unknown sends as delivered without proof, regenerate codes to hide delivery failures, or rewrite published Git history during rollback. Once repaired, re-enable one flag/lane at a time, rerun its smoke test, and record the new GO sign-off.
