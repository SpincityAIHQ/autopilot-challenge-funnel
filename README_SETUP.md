# AUTOPILOT Challenge Funnel — Setup

This project is an **independent** Lovable project. It shares nothing with NuAmenti — no code, no database, no workers, no domain.
It is currently in **preview only** and must not be published until the checklist below is complete.

---

## What's implemented

- Public routes: `/`, `/checkout`, `/confirmed`, `/privacy`, `/terms`, `/refund-policy`
- Diamond Standard / Galactic Black design system (Orbitron / Rajdhani / Space Mono / Inter), reduced-motion aware, mobile-first
- Real countdown to `2026-08-01T12:00:00-04:00`. After that instant it shows *"The live challenge has started."* and never resets
- Tier catalog with exact copy and prices: **GA $77**, **GA-only $22 bump**, **VIP $177**, **Bundle $333**, **Founder $888** (hard cap 33)
- Founder disclaimer displayed beside every Founder CTA
- Checkout page: tier selection, GA-only bump, price math, total, separate unchecked email + SMS marketing checkboxes, optional phone (explicitly *not* SMS consent), policy agreement gate
- **Fail-closed pay button**: when the Commas URL for the selected tier is missing, the button is disabled and reads *"Registration opening soon."* No fake unlocks. No URL-parameter-driven confirmations.
- Confirmed page: generic thank-you plus two separate `.ics` downloads (Day 1, Day 2, America/New_York) — no URL-based unlock
- Legal placeholders clearly marked *pending legal review*
- Event JSON-LD, per-route `<head>`, canonical + `og:url`
- Two live `.ics` endpoints: `/calendar.day1.ics` and `/calendar.day2.ics`
- Backend schema:
  - `challenge_registrations`, `challenge_payment_events`, `founder_seats` (33 pre-seeded)
  - **RLS enabled and locked**: browser cannot create or read paid registrations, payment events, or seats. Only `service_role` writes.
  - `founder_seats_remaining()` — anon-callable safe aggregate returning an integer
  - `claim_lowest_founder_seat(_registration_id)` — atomic lowest-open-seat claim with `FOR UPDATE SKIP LOCKED`; raises if seat 34+ would be needed. Executable only by `service_role`.
- **Disabled-by-default** Commas webhook at `/api/public/webhooks/commas`:
  - Returns `503` unless `COMMAS_WEBHOOKS_ENABLED=true` and `COMMAS_WEBHOOK_SECRET` are both set
  - Verifies `x-webhook-signature` as HMAC-SHA256 over the exact raw body before ANY parsing
  - Envelope: `{ id, type, data }`; supports `payment.succeeded` and `product.purchased` only
  - Idempotent by `provider_event_id` (unique DB index) AND by `commas_payment_id`
  - Unknown product ids grant nothing
  - Founder registrations trigger an atomic seat claim; the DB refuses seat 34
  - No email/SMS delivery — a clean post-verification boundary is left for the outbound provider
- Tests (Bun test runner): tier math, GA bump, countdown end state, sold-out / fail-closed URL logic, webhook signature verification, envelope parsing, product-id → tier mapping, idempotency helpers

Run tests locally with:

```
bun test
```

---

## Manual launch inputs still required

### 1. Commas configuration

Add these as **runtime env vars** in Project Settings → Secrets. Client keys must be prefixed with `VITE_` to be visible to the browser; server keys must NOT be.

Client (browser-visible, used to open Commas checkout):

| Name | Purpose |
| --- | --- |
| `VITE_COMMAS_CHECKOUT_URL_GA` | Commas hosted checkout URL for GA ($77) |
| `VITE_COMMAS_CHECKOUT_URL_GA_BUMP` | Optional: single Commas URL that pre-selects GA + bump ($99). If absent, GA+bump falls back to the GA URL and the bump is captured server-side via the mapped product id. |
| `VITE_COMMAS_CHECKOUT_URL_VIP` | VIP ($177) |
| `VITE_COMMAS_CHECKOUT_URL_BUNDLE` | Bundle ($333) |
| `VITE_COMMAS_CHECKOUT_URL_FOUNDER` | Founder Seat ($888) |
| `VITE_CHALLENGE_PREVIEW_VIDEO_URL` | Optional. If unset, the video slot is hidden entirely — no empty placeholder. |

Server (never `VITE_`-prefixed):

| Name | Purpose |
| --- | --- |
| `COMMAS_WEBHOOKS_ENABLED` | Must be the literal string `true` to activate the webhook. Any other value keeps it disabled. |
| `COMMAS_WEBHOOK_SECRET` | Shared HMAC secret from Commas. Used to verify `x-webhook-signature`. |
| `COMMAS_PRODUCT_ID_GA` | Commas product id for the $77 GA ticket. |
| `COMMAS_PRODUCT_ID_GA_BUMP` | Commas product id representing GA + $22 bump (if Commas models it as a distinct product). |
| `COMMAS_PRODUCT_ID_VIP` | Commas product id for the $177 VIP tier. |
| `COMMAS_PRODUCT_ID_BUNDLE` | Commas product id for the $333 Bundle. |
| `COMMAS_PRODUCT_ID_FOUNDER` | Commas product id for the $888 Founder Seat. |

Unknown product ids on inbound webhooks grant nothing. Leave any unused key empty.

### 2. Commas events to subscribe

Configure these two events in Commas to POST to:

```
https://<your-published-domain>/api/public/webhooks/commas
```

- `payment.succeeded`
- `product.purchased`

Both are handled. Any other event type is stored, then ignored.

### 3. Provider inventory cap — Founder Seat = 33

The database enforces the cap atomically (`claim_lowest_founder_seat` refuses to hand out seat 34). Mirror this in Commas by setting the Founder product's inventory to exactly **33** so the provider stops selling at the same moment the DB stops claiming.

### 4. Outbound provider (later)

Post-registration email and SMS delivery is intentionally not wired. The webhook leaves a clean boundary after `status = 'processed'`. Choose a provider (e.g. Resend / Postmark for email, Twilio for SMS) and wire it separately, respecting the two independent consent flags (`email_marketing_consent`, `sms_marketing_consent`). Transactional access confirmation must be sent regardless of marketing consent.

### 5. Policies

`/privacy`, `/terms`, and `/refund-policy` are placeholders and marked as such. Have counsel finalize them **before** enabling checkout.

### 6. Public proof

The "Receipts are being documented" section is intentional. Do not swap in fabricated testimonials, counters, or activity indicators. Replace it only with real, sourced, documented proof.

### 7. Domain

No public URL has been configured. Once a Lovable subdomain or a custom domain is set, revisit:

- Absolute URLs anywhere the migration/webhook path is copied into Commas (see §2)
- Sitemap (add later once routes are finalized)

### 8. Launch checklist (mobile QA)

Do all of these on a real phone before flipping publish:

- [ ] Countdown ticks and holds shape at every viewport width
- [ ] Every tier CTA lands on `/checkout` with the correct tier preselected
- [ ] Changing tier on the checkout page updates the URL and recalculates the total
- [ ] GA bump appears only for GA and disappears when switching tiers
- [ ] Pay button is **disabled and reads "Registration opening soon"** when the Commas URL for the selected tier is not set
- [ ] Legal / policy checkboxes gate the pay button
- [ ] Email and SMS marketing checkboxes are separate and default unchecked
- [ ] Phone is optional and text clearly says it is not SMS consent
- [ ] `/calendar.day1.ics` and `/calendar.day2.ics` download and open in the OS calendar with `America/New_York`
- [ ] Reduced-motion setting disables animations
- [ ] Founder section shows the "not equity, shares, an investment, profit participation, or profit-sharing" disclaimer beside every Founder CTA
- [ ] Sold-out UI has not been enabled (do NOT enable until verified data proves it)
- [ ] Webhook remains **disabled** until `COMMAS_WEBHOOKS_ENABLED=true`, the secret is set, and a signed test payload has been round-tripped end to end

---

## Explicit non-goals

- No Stripe. No Stripe code, no Stripe language.
- No calls to external services. No secrets embedded in code.
- No fake activity, counters, testimonials, or income promises.
- No URL-parameter-driven unlocks of `/confirmed`.
- No changes to the NuAmenti project. This project is separate.
