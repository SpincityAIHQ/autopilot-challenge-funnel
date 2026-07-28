# Operator Launch Checklist

Preview stays private until every P0 item is green. Nothing here fulfills
automatically — real payment webhook + verified magic-link email are the
minimum bar to sell.

## Locked event schedule

- Day 1: Saturday, August 29, 2026 · 1:00–4:00 PM Eastern
- Day 2: Sunday, August 30, 2026 · 1:00–4:00 PM Eastern
- Room opens: 12:45 PM Eastern both days
- VIP Build Lab: Sunday, August 30, 2026 · 4:15–5:45 PM Eastern, immediately after Day 2
- Secret Day 3 Vault Opener Class: Monday, August 31, 2026 · 1:00–3:00 PM Eastern, Emerald only
- Live upgrade/reset window: Sunday, August 30 · 4:00–4:15 PM Eastern

## P0 — must be green before publish

### Legal (blocking)

- [ ] Counsel-approved Privacy, Terms, and Refund Policy replace the pre-launch drafts at `/privacy`, `/terms`, `/refund-policy`.
- [ ] Final per-product refund windows posted and required to be accepted at checkout before payment is possible.
- [ ] Intensive slot-release language reflects the atomic-inventory reality (refund releases the slot back into the pool).

### Verified post-purchase identity + secure offer links

- [ ] End-to-end test: a verified GA buyer receives the NuAmenti access email, opens the magic link, lands a scoped HttpOnly session, and only then sees enabled checkout on `/offer/vip-upgrade` (and the "already have this" state after upgrading).
- [ ] Same test for Emerald Vault Key (`vault` internally) and Intensive: eligibility gates on `/offer/implementation-vault` and `/strategy-intensive` fail closed when not signed in.
- [ ] Sample without cookie hits `entitlement-summary` and receives `authenticated: false, scopes: []`.
- [ ] GA, VIP, Emerald (`VAULT` internally), and Intensive buyers each see the correct confirmation on `/next-steps`.

### Communication consent testing

- [ ] `/communication-preferences` writes one `marketing_consents` row per channel with `granted_at` OR `revoked_at`, `copy_version`, `source`, and (for SMS/AI-call) `phone`.
- [ ] SMS/AI-call submit path REJECTS when phone is missing.
- [ ] Rate-limit + same-origin behavior verified (403 cross-origin, 429 after burst).
- [ ] Revocation flow: resubmitting unchecked appends a revoke row without altering earlier history.

### Payments (Commas / FanBasis) — sequential funnel

Public site sells only General Admission at $22. Every later product is
offered post-verification, one at a time. Four current sale products only —
direct-VIP admission is NOT a current product, so no legacy direct-VIP
env var or product ID is required.

- [ ] Live product IDs exist for GA ($22), VIP Implementation Experience ($77), Emerald Vault Key (`VAULT`, $199), Intensive ($1,000).
- [ ] All 4 IDs set as env: `COMMAS_PRODUCT_ID_GA`, `_VIP_UPGRADE`, `_VAULT`, `_INTENSIVE`.
- [ ] `COMMAS_WEBHOOK_SECRET` set (strong random, minted outside this app).
- [ ] `COMMAS_WEBHOOKS_ENABLED=true`.
- [ ] Signed sample `payment.succeeded` POST to `/api/public/webhooks/commas` returns `ok` and creates a `summit_registrations` row.
- [ ] Signed sample `payment.refunded` POST reverses only the entitlement matching `source_payment_id`.
- [ ] Sample without signature returns 401. Sample with wrong currency returns 200 with `rejected` status.
- [ ] Server-side preconditions verified: VIP fulfillment REJECTS a buyer with no active GA; Emerald (`vault` product) fulfillment REJECTS a buyer with GA only; Intensive fulfillment REJECTS a buyer with GA/VIP but no `vault` entitlement (unless listed in `intensive_eligibility`).

### Commas / FanBasis success redirects (external configuration)

Configured on the checkout product itself — this app does NOT set the
return URL. Every URL below is same-origin and safe to reveal (no PII in
the query string). Neither this app nor the redirect ever proves purchase;
fulfillment is authoritative via the signed webhook.

| Product                       | Price  | Success return URL            |
| ----------------------------- | ------ | ----------------------------- |
| General Admission             | $22    | `/confirmed`                  |
| VIP Implementation Experience | $77    | `/offer/implementation-vault` |
| Emerald Vault Key (`vault`)   | $199   | `/strategy-intensive`         |
| Strategy & Build Intensive    | $1,000 | `/next-steps`                 |

Anonymous visits to any of the pages above see neutral operator-verification
copy. The product-specific "Thank you, family" gratitude and the next-offer
CTA render only after `entitlement-summary` confirms the required prior
scope from the HttpOnly session — not from `?tier=` and not from the URL.

### Checkout URLs (browser-visible)

- [ ] `VITE_COMMAS_CHECKOUT_URL_GA` — HTTPS, allowlisted host.
- [ ] `VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE` — HTTPS, allowlisted host.
- [ ] `VITE_COMMAS_CHECKOUT_URL_VAULT` — HTTPS, allowlisted host.
- [ ] `VITE_COMMAS_CHECKOUT_URL_INTENSIVE` — HTTPS, allowlisted host.
- [ ] Additional hosts (if any) in `VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS` (comma-separated).
- [ ] `VITE_SUMMIT_SALES_ENABLED=true` only when GA + all upsell URLs above resolve and `VITE_SUMMIT_LEGAL_READY=true`.

### Live Day 2 ascension

- [ ] At 3:45 PM Eastern, the GA-only VIP link is placed in the live chat and pinned.
- [ ] The GA-only email and consented SMS are scheduled for the live VIP close.
- [ ] The 4:00–4:15 PM break screen keeps the VIP link visible.
- [ ] Only verified VIP buyers enter the 4:15–5:45 PM Build Lab.
- [ ] The Emerald Vault Key link (`VITE_COMMAS_CHECKOUT_URL_VAULT`) is ready for the final part of the VIP Lab.
- [ ] Emerald purchases redirect to `/strategy-intensive`; buyers who decline return to their correct `/next-steps` confirmation.

### Delivery (email)

- [ ] Mailchimp audience created; one primary audience with tags and `SUMMITLVL` merge field.
- [ ] Exact tags from `docs/email-segmentation-map.md` created before any journey is activated.
- [ ] GA, VIP, Emerald (`VAULT` internal tag), and Intensive journeys use the locked dates and times.
- [ ] `MAILCHIMP_ENABLED=true`, `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_SENDER_EMAIL`, `MAILCHIMP_SERVER_PREFIX` set.
- [ ] Verified sender + physical address (SpincityHQ LLC · Atlanta, GA) configured.
- [ ] Welcome email template exists; access magic-link template exists.
- [ ] `delivery_outbox` gets a row per intended send (no direct SDK calls elsewhere).

### Schedule and content

- [ ] Landing page, checkout, confirmation pages, next-steps page, and metadata all say Aug 29–30, 1:00–4:00 PM Eastern.
- [ ] Every Day 1 and Day 2 calendar file carries the real start/end time and a 15-minute reminder.
- [ ] VIP page, confirmation, emails, scripts, and delivery all include MVP App Builder, AI Business GPS, Internal Agent Builder Skill, 30-day recordings, priority questions, and one 90-minute Build Lab on Sun Aug 30, 4:15–5:45 PM Eastern.
- [ ] Emerald pages, confirmations, emails, scripts, and delivery include the Secret Day 3 Vault Opener Class on Mon Aug 31, 1:00–3:00 PM Eastern, two additional live hours with Spin, private room details after purchase, 30 days of NuAmenti 3 Gold beginning Aug 10, and the full NuAmenti 3 Day recording.
- [ ] No GA page, email, script, or delivery promise includes the MVP App Builder, AI Business GPS, or Internal Agent Builder Skill.
- [ ] No buyer-facing page, email, SMS, or script uses the retired Vault product name or asset-library sales pitch.
- [ ] No retired event dates, weekday labels, separate-day VIP Lab times, all-day calendar placeholders, retired tiers, or legacy prices anywhere.
- [ ] Public landing page `/` shows NO price strings ($22 / $77 / $199 / $1,000) and NO links to `/offer/*`, `/strategy-intensive`, `/apply/mentorship`, or `/next-keynote`.
- [ ] `/checkout` exposes only General Admission ($22); any legacy `?tier=vip` link normalizes to GA.
- [ ] Offer video URLs and four final exit video URLs are either set to approved embeds or left empty.
- [ ] VSL, funnel videos, emails, SMS, and AI-call scripts use the same simple promise and the same schedule.

### Testimonials (one slot per funnel page)

- [ ] Real, released video/text testimonials loaded into `src/lib/testimonials.ts` with `status: "published"` — or the array left empty (nothing renders otherwise).
- [ ] Per-page video env slots either set to an approved-host embed URL or left empty: `VITE_TESTIMONIAL_VIDEO_LANDING`, `_CHECKOUT`, `_CONFIRMED`, `_VIP`, `_VAULT`, `_INTENSIVE`.
- [ ] Signed release on file for every published testimonial (see `docs/testimonial-scripts.md`).
- [ ] Every numeric claim in a published testimonial is backed by client-provided evidence.

### Security

- [ ] `security--run_security_scan` shows no new findings.
- [ ] `anon` / `authenticated` still have zero table privileges.
- [ ] `service_role` has only `SELECT/INSERT/UPDATE/DELETE` on required tables.

## P1 — before advertising broadly

### SMS

- [ ] Registered sender / short code approved.
- [ ] `SMS_ENABLED=true`, `SMS_PROVIDER=twilio`, `SMS_FROM`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` set.
- [ ] STOP / HELP handling verified end-to-end.
- [ ] Quiet-hours (buyer-local 8pm–9am) enforced in outbox worker.
- [ ] Schedule reminders tested for Aug 28, Aug 29, and Aug 30, including the GA-only 3:50 PM VIP invitation.

### AI / prerecorded calls

- [ ] Provider selected + registered caller ID.
- [ ] `AI_CALL_ENABLED=true`, `AI_CALL_PROVIDER`, `AI_CALL_CALLER_ID`.
- [ ] Seller-specific written consent copy version stored.
- [ ] Internal suppression + DNC integration confirmed.
- [ ] AI disclosure at call start + one-touch opt-out verified.
- [ ] Call script says the exact Summit schedule and never calls people who did not consent.

### Ascension paths

- [ ] Intensive: 10 slots seeded; `intensive_eligibility` list matches NuAmenti + Summit attendees.
- [ ] Mentorship application form live; review cadence defined.
- [ ] Keynote priority list capture + email confirmation active.

### Attribution / affiliates

- [ ] `affiliate-registry.ts` populated with real owners; every entry either `placeholder` or `live`.
- [ ] Live entries render with `rel="sponsored nofollow noopener noreferrer"`.
- [ ] Attribution persistence remains BLOCKED until a signed Commas sample confirms the exact metadata / custom-field name for first/last-touch. Client-side UTM capture + affiliate registry stay safe; server persists `null` until unblocked.

## P2 — nice-to-have

- [ ] JSON-LD `Event` schema for the Summit on the landing page.
- [ ] OG images regenerated for all shareable routes.
- [ ] Print-friendly resource previews tested on paper.
- [ ] Canonical routes: `/offer/vip-upgrade`, `/offer/implementation-vault`, `/next-keynote`, `/next-steps`, `/strategy-intensive`, `/apply/mentorship` render directly. Legacy `/vault`, `/keynote`, `/mentorship`, `/intensive`, `/offer/keynote`, `/offer/mentorship`, `/offer/strategy-intensive` redirect TO the canonicals (never the reverse).
- [ ] Attribution persistence is BLOCKED until the exact Commas metadata / custom-field name for first/last-touch is confirmed by a signed sample payload. Client-side UTM capture + affiliate registry remain safe; server persists `null` until unblocked.

## Verify before publish

```bash
bun test src/tests/       # expect all green
bunx tsc --noEmit         # expect clean
bun run build             # expect clean
```
