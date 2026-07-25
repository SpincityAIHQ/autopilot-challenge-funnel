# AI AutoPilot Summit — Full Remaster Plan

Rebuild this project in place (same slug `autopilot-challenge-funnel.lovable.app`, same Supabase). No new project, no deploy. Every external integration ships in a fail-closed configured/unconfigured state; query strings never grant access.

## 1. Current-state audit (verified)

- Routes: `/`, `/checkout`, `/confirmed`, `/privacy`, `/terms`, `/refund-policy`, `/preview-nav`, calendar `.ics` routes, webhook route.
- Tiers hardcoded: GA $77, VIP $177, Bundle $333, Founder $1,111 (cap 33).
- DB tables: `challenge_registrations`, `challenge_payment_events`, `founder_seats` (33 seats seeded).
- DB fns: `founder_seats_remaining`, `claim_lowest_founder_seat`, `fulfill_challenge_payment` (SECURITY DEFINER, 4-tier).
- Webhook `/api/public/webhooks/commas` — HMAC verified, dollar→cent, PII redacted.
- 73 tests. Copy references Aug 1–2, 12–4 PM ET, old tiers, Founder, recordings bump.
- Env vars: `VITE_COMMAS_CHECKOUT_URL_{GA,VIP,BUNDLE,FOUNDER}`, `VITE_CHALLENGE_SALES_ENABLED`, video vars.
- Sales gate/URLs unconfigured in prod — buttons already fail closed.

## 2. Scope split — build now vs. safely disabled

**Build now (code, UI, schema, tests, docs):**
- Public site copy, routes, and UX for the Summit.
- Two-tier admission (GA $22, VIP $77) + $199 Vault OTO flow.
- Confirmation UX with HeyGen video slot (fail-closed until URL configured).
- Next-keynote priority-access route (waitlist capture, no invented date/price).
- Strategy Intensive $1,000 with atomic 10-slot inventory + application route for $8,000 mentorship.
- Non-destructive DB migrations (new tables + ACL corrections; keep legacy for audit).
- Webhook refactor for new 5-product graph; refund/idempotency.
- Attribution capture (first/last-touch UTM + `ref`) into verified purchase path.
- Consent model (3 unbundled toggles, timestamped, revocable).
- Affiliate registry (typed config with placeholders + disclosure copy).
- Mailchimp adapter interface + SMS/voice adapters as stubs.
- Operator docs + full script library.
- Test/typecheck/build; operator-input checklist.

**Stays disabled until operator supplies inputs (documented in `.env.example` and checklist):**
- All 5 Commas checkout URLs + product IDs + webhook secret + signed sample payload → until then, all pay buttons say “Registration opening soon.”
- Exact Summit start/end times → UI shows “live online · session times sent to registrants.”
- HeyGen thank-you video URL → confirmation shows poster/placeholder gracefully (no “coming soon” note).
- Mailchimp API key + audience/tags + verified sender + templates → no sends attempted; adapter logs intent server-side only.
- SMS provider (Twilio-style) creds + registered sender + STOP handler → send fns short-circuit.
- AI-call provider + explicit written consent copy + DNC + AI disclosure → completely off.
- Next NuAmenti keynote date/price/checkout URL → priority-access form only, no purchase CTA.
- Affiliate destination URLs → registry entries show status=`placeholder`, links render as disabled with disclosure.

## 3. Information architecture (routes)

Keep TanStack file-based routing.

```text
/                       Landing (Summit sales page)
/checkout               ?tier=ga|vip  (only these two)
/vault                  $199 OTO — accept/decline, gated by ?token=… server-verified
/confirmed              Friendly tier-aware thank-you
/keynote                Next NuAmenti Keynote priority-access (waitlist)
/intensive              $1K Strategy & Build Intensive (10-slot atomic)
/mentorship             $8K 8-week application form
/resources              Entitlement-gated hub (magic-link token → server check)
/resources/$slug        Print-friendly resource preview (locked/unlocked variants)
/privacy /terms /refund-policy
/calendar/day1.ics /calendar/day2.ics   (Aug 24 / Aug 25)
/api/public/webhooks/commas             (rewritten for 5-product graph)
/api/public/keynote-waitlist            (rate-limited, consent-aware)
/api/public/intensive-hold              (calls atomic claim RPC)
/preview-nav            Removed from build (or gated behind server-verified staff token)
```

Delete: `calendar.day1-vip.ics`, `calendar.day2-vip.ics` (no VIP-only session time distinction now).

## 4. Data model changes (non-destructive migrations)

Keep existing tables/rows for audit. New migration:

- `summit_registrations` — full_name, email, phone?, tier(`ga`|`vip`), amount_cents, currency, commas_payment_id UNIQUE, status, timestamps, first_touch_json, last_touch_json.
- `summit_vault_purchases` — registration_id FK, commas_payment_id UNIQUE, amount_cents, status.
- `intensive_slots` — slot_number 1..10 UNIQUE, registration_id?, claimed_at. Function `claim_lowest_intensive_slot` mirroring seat logic; SECURITY DEFINER; `REVOKE EXECUTE FROM PUBLIC/anon/authenticated`; `GRANT EXECUTE TO service_role`.
- `mentorship_applications` — application form fields, status enum.
- `keynote_waitlist` — email, name?, consent_email bool, source, first/last-touch.
- `marketing_consents` — subject_email, channel(`email`|`sms`|`ai_call`), granted bool, granted_at, revoked_at?, source, copy_version. Never bundled with purchase.
- `entitlements` — registration_id FK, product(`ga`|`vip`|`vault`|`intensive`), granted_at, delivery_token (hashed).
- `affiliate_clicks` — ref_code, utm_*, landed_at, session_id (cookie), converted_registration_id?.
- Legacy tables: `REVOKE ALL … FROM PUBLIC, anon, authenticated`; drop any lingering broad grants; keep rows.
- Security-definer fulfillment fn rewritten as `fulfill_summit_payment(product, commas_payment_id, amount_cents, currency, buyer_json)` — idempotent, atomic seat claim for intensive, atomic vault attach.

All new tables: RLS enabled default-deny; grants **only** to `service_role`. Browser never reads PII.

## 5. Public UI (mobile-first)

- Landing (`/`): hero (Aug 24–25, 2026 · Live Online), Map It / Build It framing, promise, agenda placeholder times, GA vs VIP comparison, speaker/host section (facts only), FAQ, honest proof placeholder, timeline strip (InvestFest Aug 7–9 → NuAmenti 3 Launch Aug 10 → Summit Aug 24–25), footer SpincityHQ LLC · Info@NuAmenti.com · Atlanta GA. Countdown to Aug 24, 2026 midnight ET; after → “The Summit is live.”
- `/checkout`: only GA/VIP; shows selection, price, policy link; 3 unbundled unchecked consent boxes; optional phone (not consent); “Continue to secure checkout” → Commas URL if configured, else disabled with “Registration opening soon.”
- `/confirmed`: tier-aware. Headline: “Thank you, family — you’re officially registered with the [GA Ticket / VIP Experience].” HeyGen video slot (fail-closed graceful poster). Delivery expectations, spam/promotions check, calendar buttons, preparation checklist, then upsell card → **Vault OTO**.
- `/vault`: $199 accept/decline. Requires server-verified token from webhook. Accept → Commas Vault URL (if configured). Decline → `/keynote`.
- `/keynote`: waitlist form only; no fabricated date/price. Copy: “Get priority access when the next keynote is announced.”
- `/intensive`: shows real remaining slot count from safe aggregate view. Fail-closed if unconfigured. Atomic hold via server fn.
- `/mentorship`: application form, no payment.
- `/resources` + `/resources/$slug`: token-gated server fetch; print-friendly CSS; previews for Action Guide, AI Readiness Scorecard, Buyer+Offer Canvas, Prompt Stack, Autonomy Map, Site Blueprint, Campaign Calendar, Proposal Kit, SOP Pack, Affiliate Directory.

Brand: keep Diamond Standard / Galactic Black. Rewrite hero and section copy for family-centered warm-premium voice per project knowledge. No fake counts.

## 6. Webhook + payments

- Rewrite `/api/public/webhooks/commas` for 5-product graph: GA, VIP, Vault, Intensive, (future Keynote — mapping optional).
- Config validation: require 5 product IDs + secret + allowed host(s) + signed sample; missing → 503 fail-closed and site sales gate stays off.
- HMAC over raw body, 64KB guard, price/currency assertion, idempotent by event ID + payment ID, refund/failure handling → mark entitlement revoked.
- Never trust query strings. Post-purchase token is HMAC-signed server-side and single-use.

## 7. Attribution + affiliates

- Root-level effect captures `ref`, `utm_source|medium|campaign|content` on first visit → `sessionStorage` first-touch + cookie last-touch; forwarded through checkout via signed state param and stored only on verified fulfillment.
- `src/lib/affiliate-registry.ts`: typed entries `{id, name, category, owner, status: 'placeholder'|'live', destination_url?, disclosure, utm}`. Renderer disables link when `status !== 'live'` and shows disclosure inline. No hardcoded partner URLs.

## 8. Consent + comms adapters

- `src/lib/consent.ts`: 3 channels, versioned copy strings, revoke API.
- `src/lib/mailchimp.ts`: adapter interface; env-checked; if unconfigured, `sendTransactional`/`tag` no-op with structured log.
- `src/lib/sms.ts`, `src/lib/ai-call.ts`: same pattern; include STOP/HELP handling stub and quiet-hours guard.
- Docs make clear nothing is sending until operator configures.

## 9. Operator documentation

- `docs/campaign-playbook.md` — full script library: InvestFest lead-capture → NuAmenti 3 proof → Summit registration → reminders → event-day → post-Summit $1K/$8K. Sections per channel (email/SMS/DM/AI-call). Research vs. new strategy clearly separated.
- `docs/resource-delivery.md` — token flow, print CSS, resource inventory.
- `docs/operator-launch-checklist.md` — every required input, verification step, and “do not go live until…” gates.
- `.env.example` — every variable with description and required/optional flag.
- Update `README_SETUP.md` to point at the above.

## 10. Tests (rewritten)

Replace legacy tier/date tests. New suite covers:
- Tier catalog: only `ga`/`vip` public admission; Vault/Intensive are separate products.
- Price math + currency enforcement per product.
- Countdown → Aug 24, 2026; post-start state.
- Webhook: signature, size guard, idempotency, refund revokes entitlement, unknown product rejected, Vault attach requires prior registration.
- Atomic intensive claim: slot 11 rejected; concurrent claim safe.
- Consent: unbundled, revocable, timestamped, not required for purchase.
- Attribution: first/last-touch persisted only on verified fulfillment.
- Affiliate registry: placeholder entries render disabled + disclosure.
- Confirmation copy: tier-exact “Thank you, family” headline; no old prices/dates.
- Fail-closed: missing Commas URLs → disabled CTAs.
- Calendar ICS: Aug 24 + Aug 25 America/New_York, no old dates anywhere.
- Grep test: repo contains no `$77`/`$177`/`$333`/`$1,111`/`Founder`/`Bundle`/`Aug 1`/`Aug 2` in public routes, SEO, calendars, docs (allow-list for legacy migration SQL and audit history).

Target ~90+ tests. `bunx vitest run` + `tsgo` + build must all pass.

## 11. `/preview-nav` protection

Remove the route file. If retained, wrap in a server-verified staff token check (env `STAFF_PREVIEW_TOKEN`), 404 otherwise. Never linked publicly.

## 12. Deletion / cleanup list

- Remove Founder + Bundle + recordings-bump copy/logic from `src/lib/tiers.ts`, `funnel-content.ts`, `challenge-config.ts`, index/checkout/confirmed routes, tests.
- Remove `use-founder-seats.ts` (replaced by intensive-slots hook).
- Remove VIP-only calendar files.
- Purge Aug 1–2 / 12–4 PM ET copy.
- Keep legacy DB tables + rows; revoke grants.

## 13. Operator-input checklist (delivered in docs + summarized in chat post-build)

Inputs required before enabling anything live:
1. Commas: 5 product IDs (GA, VIP, Vault, Intensive, [Keynote?]), 5 hosted checkout URLs, webhook secret, signed sample payload, allowed host(s).
2. `VITE_CHALLENGE_SALES_ENABLED=true` only after 1 is verified.
3. Summit start/end times per day (ET).
4. HeyGen thank-you video URL.
5. Mailchimp: API key, audience ID, tag/segment IDs, verified sender domain, template IDs.
6. SMS: provider creds, registered sender/short code, STOP handler URL.
7. AI-call: provider, seller-specific consent copy, DNC integration.
8. Next keynote details (date/time/price/checkout URL) when announced.
9. Affiliate destinations per registry entry (owner + disclosure text).
10. Staff preview token (if `/preview-nav` retained).

## 14. Verification pass

- `bunx vitest run` all green.
- `tsgo` typecheck clean.
- Production build succeeds.
- Manual mobile QA of every public route; keyboard + reduced-motion; no horizontal overflow.
- Confirm no `$77`/`Founder`/`Aug 1` etc. leak via `rg` in public paths.

## Technical details

- Keep TanStack Start server-fn / server-route split. Webhook stays under `/api/public/*` with HMAC + size guard. Token issuance for `/vault` and `/resources` uses HMAC(payload=registration_id|product|nonce, key=SESSION_SECRET) with single-use nonce table.
- New tables follow the mandatory `CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY` order; all policies scope to `service_role` only (no anon/authenticated grants).
- Safe public aggregate `intensive_slots_remaining()` (SECURITY DEFINER, returns int, granted to anon/authenticated) mirrors `founder_seats_remaining` pattern.
- `SESSION_SECRET` generated via `generate_secret` during build wave; never asked from user.
- Deployment intentionally deferred; plan ends at green build + operator checklist.
