# Operator Launch Checklist

Preview stays private until every P0 item is green. Nothing here fulfills
automatically — real payment webhook + verified magic-link email are the
minimum bar to sell.

## P0 — must be green before publish

### Legal (blocking)
- [ ] Counsel-approved Privacy, Terms, and Refund Policy replace the pre-launch drafts at `/privacy`, `/terms`, `/refund-policy`.
- [ ] Final per-product refund windows posted and required to be accepted at checkout before payment is possible.
- [ ] Intensive slot-release language reflects the atomic-inventory reality (refund releases the slot back into the pool).

### Verified post-purchase identity + secure offer links
- [ ] End-to-end test: a verified GA buyer receives the NuAmenti access email, opens the magic link, lands a scoped HttpOnly session, and only then sees enabled checkout on `/offer/vip-upgrade` (and the "already have this" state after upgrading).
- [ ] Same test for Vault and Intensive: eligibility gates on `/offer/implementation-vault` and `/strategy-intensive` fail closed when not signed in.
- [ ] Sample without cookie hits `entitlement-summary` and receives `authenticated: false, scopes: []`.

### Communication consent testing
- [ ] `/communication-preferences` writes one `marketing_consents` row per channel with `granted_at` OR `revoked_at`, `copy_version`, `source`, and (for SMS/AI-call) `phone`.
- [ ] SMS/AI-call submit path REJECTS when phone is missing.
- [ ] Rate-limit + same-origin behavior verified (403 cross-origin, 429 after burst).
- [ ] Revocation flow: resubmitting unchecked appends a revoke row without altering earlier history.



### Payments (Commas / FanBasis) — sequential funnel

Public site sells only General Admission at $22. Every later product is
offered post-verification, one at a time.

- [ ] Live product IDs exist for GA ($22), VIP ($77), VIP Implementation Experience ($77), Vault ($199), Intensive ($1,000).
- [ ] All 5 IDs set as env: `COMMAS_PRODUCT_ID_GA`, `_VIP`, `_VIP_UPGRADE`, `_VAULT`, `_INTENSIVE`.
- [ ] `COMMAS_WEBHOOK_SECRET` set (strong random, minted outside this app).
- [ ] `COMMAS_WEBHOOKS_ENABLED=true`.
- [ ] Signed sample `payment.succeeded` POST to `/api/public/webhooks/commas` returns `ok` and creates a `summit_registrations` row.
- [ ] Signed sample `payment.refunded` POST reverses the same row (`reversed_product` returned).
- [ ] Sample without signature returns 401. Sample with wrong currency returns 200 with `rejected` status.
- [ ] Server-side preconditions verified: Vault fulfillment REJECTS a buyer with GA only; Intensive fulfillment REJECTS a buyer with GA/VIP but no Vault (unless listed in `intensive_eligibility`).

### Commas / FanBasis success redirects (external configuration)

Configured on the checkout product itself — this app does NOT set the
return URL. Every URL below is same-origin and safe to reveal (no PII in
the query string). Decline paths live inside the app on `/next-steps`.

| Product | Price | Success return URL | Decline path |
|---------|-------|--------------------|--------------|
| General Admission | $22 | `/confirmed?tier=ga` | n/a |
| VIP Implementation Experience | $77 | `/offer/implementation-vault` | `/next-steps` |
| Implementation Vault | $199 | `/strategy-intensive` | `/next-steps` |
| Strategy & Build Intensive | $1,000 | `/next-steps` | `/next-steps` |
| Legacy direct VIP admission | $77 | `/confirmed?tier=vip` | n/a |

Fulfillment is authoritative via the signed webhook — a redirect URL
never proves purchase.


### Checkout URLs (browser-visible)
- [ ] `VITE_COMMAS_CHECKOUT_URL_GA` — HTTPS, allowlisted host.
- [ ] `VITE_COMMAS_CHECKOUT_URL_VIP` — HTTPS, allowlisted host.
- [ ] `VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE` — HTTPS, allowlisted host.
- [ ] `VITE_COMMAS_CHECKOUT_URL_VAULT` — HTTPS, allowlisted host.
- [ ] `VITE_COMMAS_CHECKOUT_URL_INTENSIVE` — HTTPS, allowlisted host.
- [ ] Additional hosts (if any) in `VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS` (comma-separated).
- [ ] `VITE_SUMMIT_SALES_ENABLED=true` only when all four admission + OTO URLs above resolve.

### Delivery (email)
- [ ] Mailchimp audience created; single audience or per-tag segments.
- [ ] `MAILCHIMP_ENABLED=true`, `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_SENDER_EMAIL`, `MAILCHIMP_SERVER_PREFIX` set.
- [ ] Verified sender + physical address (SpincityHQ LLC · Atlanta, GA) configured.
- [ ] Welcome email template exists; access magic-link template exists.
- [ ] `delivery_outbox` gets a row per intended send (no direct SDK calls elsewhere).

### Content
- [ ] Summit start times filled in (or copy remains "session times sent to registrants").
- [ ] No stale references to Aug 1–2, Founder, Bundle, $88, $177, $333, $888, $1,111 anywhere.
- [ ] Public landing page `/` shows NO price strings ($22 / $77 / $199 / $1,000) and NO links to `/offer/*`, `/strategy-intensive`, `/apply/mentorship`, or `/next-keynote`.
- [ ] `/checkout` exposes only General Admission ($22); any legacy `?tier=vip` link normalizes to GA.
- [ ] Video URLs (`VITE_SUMMIT_VIDEO_HERO`, `VITE_SUMMIT_VIDEO_THANK_YOU`) either set to approved embed URLs or left empty.

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
- [ ] Quiet-hours (buyer-local 9pm–9am) enforced in outbox worker.

### AI / prerecorded calls
- [ ] Provider selected + registered caller ID.
- [ ] `AI_CALL_ENABLED=true`, `AI_CALL_PROVIDER`, `AI_CALL_CALLER_ID`.
- [ ] Seller-specific written consent copy version stored.
- [ ] Internal suppression + DNC integration confirmed.
- [ ] AI disclosure at call start + one-touch opt-out verified.

### Ascension paths
- [ ] Intensive: 10 slots seeded; `intensive_eligibility` list matches NuAmenti + Summit attendees.
- [ ] Mentorship application form live; review cadence defined.
- [ ] Keynote priority list capture + email confirmation active.

### Attribution / affiliates
- [ ] `affiliate-registry.ts` populated with real owners; every entry either `placeholder` or `live`.
- [ ] Live entries render with `rel="sponsored nofollow noopener noreferrer"`.
- [ ] Attribution persistence remains BLOCKED until a signed Commas sample
      confirms the exact metadata / custom-field name for first/last-touch.
      Client-side UTM capture + affiliate registry stay safe; server persists
      `null` until unblocked. Do NOT check this off just because URLs contain UTMs.


## P2 — nice-to-have

- [ ] JSON-LD `Event` schema for the Summit on the landing page.
- [ ] OG images regenerated for all shareable routes.
- [ ] Print-friendly resource previews tested on paper.
- [ ] Canonical routes: `/offer/vip-upgrade`, `/offer/implementation-vault`, `/next-keynote`, `/next-steps`, `/strategy-intensive`, `/apply/mentorship` render directly. Legacy `/vault`, `/keynote`, `/mentorship`, `/intensive`, `/offer/keynote`, `/offer/mentorship`, `/offer/strategy-intensive` redirect TO the canonicals (never the reverse).
- [ ] Attribution persistence is BLOCKED until the exact Commas metadata / custom-field name for first/last-touch is confirmed by a signed sample payload. Client-side UTM capture + affiliate registry remain safe; server persists `null` until unblocked.
- [ ] Calendar files (`/calendar/day1.ics`, `/calendar/day2.ics`) are intentionally all-day for Aug 24 and Aug 25 until exact session times are configured. Exact times go in access emails, not in the ICS.

## Verify before publish

```bash
bun test src/tests/       # expect all green
bunx tsgo --noEmit        # expect clean
bun run build             # expect clean
```
