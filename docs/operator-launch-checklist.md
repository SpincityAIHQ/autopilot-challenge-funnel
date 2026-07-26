# Operator Launch Checklist

Preview stays private until every P0 item is green. Nothing here fulfills
automatically — real payment confirmation, verified identity, and the secure
post-purchase path are the minimum bar to sell.

## Locked event schedule

- Day 1: Saturday, August 29, 2026 · 1:00–4:00 PM Eastern
- Day 2: Sunday, August 30, 2026 · 1:00–4:00 PM Eastern
- Room opens: 12:45 PM Eastern both days
- VIP Build Lab: Sunday, August 30, 2026 · 4:15–5:45 PM Eastern, immediately after Day 2
- Live upgrade/reset window: Sunday, August 30 · 4:00–4:15 PM Eastern

## P0 — must be green before publish

### Legal (blocking)
- [ ] Counsel-approved Privacy, Terms, and Refund Policy replace the pre-launch drafts at `/privacy`, `/terms`, `/refund-policy`.
- [ ] Final per-product refund windows posted and required to be accepted at checkout before payment is possible.
- [ ] Saved-card CTA clearly states the exact amount, card brand/last four, one-time charge, and no subscription.
- [ ] Intensive slot-release language reflects the atomic-inventory reality (refund releases the slot back into the pool).

### Verified post-purchase identity + secure offer links
- [ ] End-to-end test: a verified GA buyer receives the NuAmenti access email, opens the magic link, lands a scoped HttpOnly session, and only then sees enabled VIP purchase action.
- [ ] Same test for Vault and Intensive: eligibility gates on `/offer/implementation-vault` and `/strategy-intensive` fail closed when not signed in.
- [ ] Sample without cookie hits `entitlement-summary` and receives `authenticated: false, scopes: []`.
- [ ] GA, VIP, Vault, and Intensive buyers each see the correct confirmation on `/next-steps`.

### Communication consent testing
- [ ] `/communication-preferences` writes one `marketing_consents` row per channel with `granted_at` OR `revoked_at`, `copy_version`, `source`, and (for SMS/AI-call) `phone`.
- [ ] SMS/AI-call submit path REJECTS when phone is missing.
- [ ] Rate-limit + same-origin behavior verified (403 cross-origin, 429 after burst).
- [ ] Revocation flow: resubmitting unchecked appends a revoke row without altering earlier history.

### Payments (Commas / FanBasis) — sequential funnel

Public site sells only General Admission at $22. Every later product is
offered post-verification, one at a time. Four current sale products only —
direct-VIP admission is NOT a current product.

- [ ] Live product IDs exist for GA ($22), VIP Implementation Experience ($77), Vault ($199), Intensive ($1,000).
- [ ] All 4 IDs set as env: `COMMAS_PRODUCT_ID_GA`, `_VIP_UPGRADE`, `_VAULT`, `_INTENSIVE`.
- [ ] `COMMAS_WEBHOOK_SECRET` set (strong random, minted outside this app).
- [ ] `COMMAS_WEBHOOKS_ENABLED=true`.
- [ ] Signed sample `payment.succeeded` POST to `/api/public/webhooks/commas` returns `ok` and creates the expected entitlement.
- [ ] Signed sample `payment.refunded` POST reverses only the entitlement matching `source_payment_id`.
- [ ] Sample without signature returns 401. Sample with wrong currency returns 200 with `rejected` status.
- [ ] Server-side preconditions verified: VIP REJECTS no active GA; Vault REJECTS GA only; Intensive REJECTS no Vault unless explicitly eligible.

### Commas / FanBasis success redirects (external configuration)

Configured on the checkout product itself — this app does NOT set the return
URL. Every URL below is same-origin and contains no PII. Neither the redirect
nor a query string proves purchase.

| Product                        | Price   | Success return URL                     |
|--------------------------------|---------|----------------------------------------|
| General Admission              | $22     | `/confirmed`                           |
| VIP Implementation Experience  | $77     | `/offer/implementation-vault`          |
| Implementation Vault           | $199    | `/strategy-intensive`                  |
| Strategy & Build Intensive     | $1,000  | `/next-steps`                          |

### Checkout URLs (browser-visible)
- [ ] `VITE_COMMAS_CHECKOUT_URL_GA` — HTTPS, allowlisted host.
- [ ] `VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE` — HTTPS fallback even when one-click is active.
- [ ] `VITE_COMMAS_CHECKOUT_URL_VAULT` — HTTPS fallback even when one-click is active.
- [ ] `VITE_COMMAS_CHECKOUT_URL_INTENSIVE` — HTTPS; Intensive always uses full checkout.
- [ ] Additional hosts (if any) in `VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS`.
- [ ] `VITE_SUMMIT_SALES_ENABLED=true` only when all links resolve and `VITE_SUMMIT_LEGAL_READY=true`.

### Saved-card one-click VIP + Vault
- [ ] Migration `20260726074500_one_click_charge_attempts.sql` applied.
- [ ] Sandbox API key added as `COMMAS_API_KEY`.
- [ ] `COMMAS_API_ENV=sandbox` during all testing.
- [ ] `COMMAS_ONE_CLICK_ENABLED=true` only in the sandbox test environment first.
- [ ] GA sandbox buyer sees the exact saved-card brand/last four and $77 amount.
- [ ] One click creates exactly one VIP charge, entitlement, and continuation to the Vault.
- [ ] VIP sandbox buyer sees the exact saved-card brand/last four and $199 amount.
- [ ] One click creates exactly one Vault charge, entitlement, and continuation to the Intensive.
- [ ] Double tap, refresh, duplicate POST, timeout, and API 409 never create a second charge.
- [ ] Missing card, API unavailable, and declined charge fall back to the normal Commas checkout.
- [ ] Unknown charge status removes the charge button and tells the buyer not to retry.
- [ ] Browser source contains no API key, customer ID, payment-method ID, buyer email, or full card data.
- [ ] Intensive has NO one-click path; full checkout and real seat inventory remain required.
- [ ] One controlled live internal purchase passes before `COMMAS_API_ENV=production` is used publicly.

See `docs/video-first-and-one-click-setup.md` for the complete test matrix.

### Live Day 2 ascension
- [ ] At 3:45 PM Eastern, the GA-only VIP action is placed in the live chat and pinned.
- [ ] The GA-only email and consented SMS are scheduled for the live VIP close.
- [ ] The 4:00–4:15 PM break screen keeps the VIP action visible.
- [ ] Only verified VIP buyers enter the 4:15–5:45 PM Build Lab.
- [ ] The Vault action is ready for the final part of the VIP Lab.
- [ ] Vault buyers continue to `/strategy-intensive`; declines reach the right `/next-steps` confirmation.

### Delivery (email)
- [ ] Mailchimp audience created; one primary audience with tags and `SUMMITLVL` merge field.
- [ ] Exact tags from `docs/email-segmentation-map.md` created before any journey is activated.
- [ ] GA, VIP, Vault, and Intensive journeys use the locked dates and times.
- [ ] `MAILCHIMP_ENABLED=true`, `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_SENDER_EMAIL`, `MAILCHIMP_SERVER_PREFIX` set.
- [ ] Verified sender + physical address configured.
- [ ] Welcome email and access magic-link templates exist.
- [ ] `delivery_outbox` gets one row per intended send.

### Schedule, content, and video-first UI
- [ ] Landing, checkout, confirmation, next-steps, and metadata all say Aug 29–30, 1:00–4:00 PM Eastern.
- [ ] Calendar files carry real times and 15-minute reminders.
- [ ] VIP copy says Sun Aug 30, 4:15–5:45 PM Eastern, immediately after Day 2.
- [ ] No stale Aug 1–2, Aug 24–25, Monday/Tuesday, Sep 3 VIP, Founder, Bundle, or legacy prices.
- [ ] Public landing page shows no prices and no direct later-offer links.
- [ ] `/checkout` exposes only General Admission ($22).
- [ ] Every funnel page renders `headline → video → primary action → optional reading`.
- [ ] Landing VSL appears before the supporting small print.
- [ ] All join/upgrade buttons are full-width on mobile and immediately below the video.
- [ ] Every funnel video autoplays muted/inline where allowed and shows “tap for sound.”
- [ ] Final YouTube/Vimeo videos tested on real iPhone and Android devices.
- [ ] Offer and four exit video URLs are set or intentionally empty.
- [ ] VSL, emails, SMS, calls, and live scripts use one promise and one schedule.

### Testimonials
- [ ] Real, released testimonials are `status: "published"`; empty means nothing renders.
- [ ] Per-page testimonial video env slots are set or intentionally empty.
- [ ] Signed release on file for every published testimonial.
- [ ] Every numeric claim is backed by client-provided evidence.

### Security
- [ ] Security scan shows no new findings.
- [ ] `anon` / `authenticated` have zero table access to payment, identity, and one-click audit data.
- [ ] `service_role` has only required privileges.
- [ ] `/api/public/one-click-offer` requires same-origin, rate limit, verified session, entitlement, explicit click, and duplicate reservation.

## P1 — before advertising broadly

### SMS
- [ ] Registered sender / short code approved.
- [ ] SMS provider credentials set.
- [ ] STOP / HELP handling verified end-to-end.
- [ ] Quiet-hours enforced.
- [ ] Schedule reminders tested, including GA-only live VIP invitation.

### AI / prerecorded calls
- [ ] Provider selected + registered caller ID.
- [ ] AI-call credentials set.
- [ ] Seller-specific written consent stored.
- [ ] DNC and suppression confirmed.
- [ ] AI disclosure + one-touch opt-out verified.
- [ ] Script says exact Summit schedule.

### Ascension paths
- [ ] Intensive: 10 slots seeded; eligibility list reviewed.
- [ ] Mentorship application live; review cadence defined.
- [ ] Keynote priority capture active.

### Attribution / affiliates
- [ ] Affiliate registry populated with real owners.
- [ ] Live links use sponsored/nofollow/noopener/noreferrer.
- [ ] Attribution persistence remains blocked until Commas metadata field is confirmed by a signed sample.

## P2 — nice-to-have

- [ ] JSON-LD `Event` schema.
- [ ] OG images regenerated.
- [ ] Print-friendly resources tested.
- [ ] Canonical routes and legacy redirects verified.

## Verify before publish

```bash
bun test src/tests/
bunx tsc --noEmit
bun run build
scripts/scan-assets.sh
```
