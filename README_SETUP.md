# AUTOPILOT Challenge Funnel — Setup

This project is an **independent** Lovable project. It shares nothing with NuAmenti — no code, no database, no workers, no domain.
It is currently in **preview only** and must not be published until the checklist below is complete.

---

## What's implemented

- Public routes: `/`, `/checkout`, `/confirmed`, `/privacy`, `/terms`, `/refund-policy`
- Diamond Standard / Galactic Black design system, reduced-motion aware, mobile-first
- Countdown to `2026-08-01T12:00:00-04:00`; after that instant it shows *"The live challenge has started."* and never resets
- Tier catalog with exact copy and prices: **GA $77**, **VIP $177**, **Bundle $333**, **Founder $1,111** (hard cap 33). The $22 GA recordings bump is a **native Commas order bump inside GA checkout** — this app never shows a bumped total or a fake GA+bump URL
- Founder disclaimer displayed adjacent to every Founder CTA (landing, Founder section, final CTA, checkout)
- Handoff `/checkout` is a review-only summary — Commas securely collects buyer details, payment, and marketing consent on the next screen. No PII or consent is passed through URLs
- **Two independent handoff gates**:
  - `VITE_CHALLENGE_SALES_ENABLED` (must be literal `"true"`) — global gate
  - Per-tier Commas URL must exist
  - Founder additionally requires verified `founder_seats_remaining() > 0` from the safe RPC; an unknown seat state fails closed once sales are enabled
- Verified availability: at 0 seats remaining and sales enabled → SOLD OUT UI, Founder handoff disabled
- Neutral confirmation page: heading is *"Payment confirmation pending"*. Access is granted only from the verified webhook and email. Includes a "what to bring" section and a share CTA that never leaks access
- Legal placeholders (`/privacy`, `/terms`, `/refund-policy`) all `noindex,nofollow`, clearly marked *pending legal review*
- Two live `.ics` endpoints at the real paths **`/calendar/day1.ics`** and **`/calendar/day2.ics`** (America/New_York)
- Event JSON-LD represents both sessions accurately via `subEvent`. Public URL fields are intentionally unset until a real domain is configured
- Video slot accepts only an allowlist (YouTube watch / youtu.be / YouTube embed / Vimeo). Anything else fails closed. Iframe is `loading="lazy"`, `referrerPolicy="no-referrer"`, `allowFullScreen`
- No runtime Google Fonts calls. Design uses strong local/system fallbacks (Orbitron/Rajdhani/Space Mono/Inter families with `ui-sans-serif`/`ui-monospace`/`system-ui` fallbacks). Install `@fontsource/*` packages later if you want self-hosted glyphs
- Backend schema:
  - `challenge_registrations`, `challenge_payment_events`, `founder_seats` (33 pre-seeded)
  - **RLS enabled and locked**: browser cannot read or write registrations, payment events, or seats. Only `service_role` writes
  - `founder_seats_remaining()` — anon/authenticated-callable safe integer aggregate
  - `claim_lowest_founder_seat(uuid)` — atomic lowest-open-seat claim. `EXECUTE` restricted to `service_role`
  - `fulfill_challenge_payment(...)` — SECURITY DEFINER, `service_role` only. In a single transaction it validates tier, creates or returns the registration idempotently by `commas_payment_id`, and for Founder claims the lowest open seat *before* confirming. If no seat is available it raises and leaves no confirmed registration. Returns registration id, optional seat, and whether it already existed
- **Disabled-by-default** Commas webhook at `/api/public/webhooks/commas`:
  - `503` unless `COMMAS_WEBHOOKS_ENABLED=true` AND `COMMAS_WEBHOOK_SECRET` set
  - HMAC-SHA256 (timing-safe compare) over the **exact raw body** verified before any parsing
  - Canonical fulfillment event: **`payment.succeeded`** with `data.status === "succeeded"`. `product.purchased` is stored redacted and marked `ignored` (audit only) — it never fulfills
  - Monetary values are decimal **dollars**; converted with `Math.round(v * 100)` (77.00 → 7700, 49.99 → 4999)
  - Base tier from `data.item.id`; native order bump detected via `data.order_bumps[].item.id === COMMAS_PRODUCT_ID_GA_BUMP`. Non-GA never bumps. Bump is never a base tier
  - Envelope validation requires `id`, `type`, `data.status === "succeeded"`, `payment_id`, `item.id`, buyer name + email, finite positive amount, currency. Never fabricates "Unknown", fake email, or `0`
  - Payload stored **redacted**: event id/type, payment id, status, currency, amount, base item id/title, bump item ids, buyer provider id. Never buyer name/email/phone/address/metadata
  - Idempotency: duplicate `provider_event_id` reads its prior state — `processed`/`ignored` returns 200; `received`/`error` resumes. Duplicate `commas_payment_id` returns existing fulfillment via the RPC (no second seat claim)
  - Transient DB errors → 500 (Commas retries). Genuine Founder cap failure → recorded as error and returns deterministic 200 so it does not loop forever; grants nothing
  - No email/SMS delivery — a clean post-verification boundary is left for the outbound provider
- Tests (Bun test runner) — see below

Run tests locally:

```
bun test
```

---

## Manual launch inputs still required

### 1. Commas configuration

Add these as **runtime env vars** in Project Settings → Secrets. Client keys must be prefixed with `VITE_` to reach the browser; server keys must NOT be.

Client (browser-visible):

| Name | Purpose |
| --- | --- |
| `VITE_CHALLENGE_SALES_ENABLED` | Overall sales gate. Must be the literal string `"true"` for ANY handoff button to enable. |
| `VITE_COMMAS_CHECKOUT_URL_GA` | Commas hosted checkout URL for GA ($77). The $22 recordings bump is offered **inside** this checkout as a native order bump — do NOT create a separate GA+bump URL |
| `VITE_COMMAS_CHECKOUT_URL_VIP` | VIP ($177) |
| `VITE_COMMAS_CHECKOUT_URL_BUNDLE` | Bundle ($333) |
| `VITE_COMMAS_CHECKOUT_URL_FOUNDER` | Founder Seat ($1,111). The Commas Founder product itself MUST be configured at exactly $1,111 |
| `VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS` | Optional. Comma-separated extra approved checkout hosts (exact match only). The default allowlist is `www.fanbasis.com`. Anything off-list, non-https, or with embedded credentials fails closed |
| `VITE_CHALLENGE_PREVIEW_VIDEO_URL` | Optional. YouTube (watch / youtu.be / embed) or Vimeo only. Anything else fails closed and the section stays hidden |

Server (never `VITE_`-prefixed):

| Name | Purpose |
| --- | --- |
| `COMMAS_WEBHOOKS_ENABLED` | Must be the literal string `true` to activate the webhook. Any other value keeps it disabled |
| `COMMAS_WEBHOOK_SECRET` | Shared HMAC secret from Commas. Used to verify `x-webhook-signature` |
| `COMMAS_PRODUCT_ID_GA` | Base product id for the $77 GA ticket |
| `COMMAS_PRODUCT_ID_GA_BUMP` | Order-bump product id for the $22 recordings + completed-map template (attached inside GA checkout) |
| `COMMAS_PRODUCT_ID_VIP` | $177 VIP |
| `COMMAS_PRODUCT_ID_BUNDLE` | $333 Bundle |
| `COMMAS_PRODUCT_ID_FOUNDER` | $1,111 Founder Seat |

Unknown product ids grant nothing. Leave any unused key empty.

### 2. Commas hosted-checkout wiring

For each Commas product, configure:

- `success_url` → `https://<your-published-domain>/confirmed`
- Cancellation / back URL → `https://<your-published-domain>/` (or the tier's landing anchor)
- Two separate **unchecked** custom fields inside Commas: **Email marketing consent** and **SMS marketing consent**. Until a verified webhook field mapping for those fields is implemented, this app records both marketing consents as `false` and only sends transactional access. Phone is optional and is not consent
- Configure webhook events to POST to `https://<your-published-domain>/api/public/webhooks/commas` for exactly:
  - `payment.succeeded` — canonical fulfillment
  - `product.purchased` — audit only

### 3. Provider inventory cap — Founder Seat = 33

The database enforces the cap atomically (`fulfill_challenge_payment` claims the seat before confirming the registration; if no seat, no confirmed registration exists). Mirror this in Commas by setting the Founder product's inventory to exactly **33**.

### 4. Sandbox round-trip

Before flipping `COMMAS_WEBHOOKS_ENABLED=true` in production:

- [ ] Verify the checkout host used in every `VITE_COMMAS_CHECKOUT_URL_*` env var is on the allowlist (`www.fanbasis.com` by default, or a verified extra host added via `VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS`)
- [ ] Confirm all five `COMMAS_PRODUCT_ID_*` values are set to **distinct** ids
- [ ] Sign a valid `payment.succeeded` test payload with `COMMAS_WEBHOOK_SECRET` and POST it to the webhook path
- [ ] Confirm the row appears in `challenge_payment_events` with `status = 'processed'` and no PII in `payload`
- [ ] Confirm the row in `challenge_registrations` has the expected tier / amount / bump / commas_payment_id
- [ ] For Founder: confirm one row moved in `founder_seats`
- [ ] Replay the same event id → response is 200 and no new registration or seat claim
- [ ] Send a `product.purchased` for the same order → stored `ignored`; no registration created
- [ ] **Under-price attempt** (e.g. $1 GA event): stored with `status='error'`, no registration created, deterministic 200
- [ ] **Over-price / retired-price attempt** (e.g. $888 Founder event): stored with `status='error'`, no registration, deterministic 200
- [ ] **Non-USD currency** (e.g. EUR): stored with `status='error'`, no registration, deterministic 200

### 5. Outbound provider (later)

Post-registration email and SMS delivery is intentionally not wired. The webhook leaves a clean boundary after fulfillment. Wire your provider (Resend/Postmark/Twilio) respecting the two independent consent flags on `challenge_registrations`. Transactional access confirmation must be sent regardless of marketing consent.

### 6. Policies

`/privacy`, `/terms`, and `/refund-policy` are placeholders (`noindex,nofollow`). Have counsel finalize them **before** flipping the sales gate. The checkout page does not require the user to agree to placeholder policies.

### 7. Public proof

The "Receipts are being documented" section is intentional. Do not swap in fabricated testimonials, counters, or activity indicators.

### 8. Domain

No public URL has been configured. Once a Lovable subdomain or a custom domain is set, revisit:

- Absolute URLs anywhere the webhook path is copied into Commas
- Absolute URLs in JSON-LD (currently intentionally omitted)
- Sitemap (add later once routes are finalized)

### 9. Launch checklist (mobile QA)

Do all of these on a real phone before flipping publish:

- [ ] Countdown ticks and holds shape at every viewport width
- [ ] Every tier CTA lands on `/checkout` with the correct tier preselected
- [ ] Pay button is disabled and reads **"Registration opening soon"** when the sales gate is off OR the URL is missing
- [ ] GA checkout page shows the native-bump copy — no fake $99 total
- [ ] Founder pay button fails closed if seats-remaining is unknown; shows SOLD OUT at 0
- [ ] Founder non-equity disclaimer appears adjacent to every Founder CTA including final CTA and checkout
- [ ] `/calendar/day1.ics` and `/calendar/day2.ics` download and open in the OS calendar with America/New_York
- [ ] Reduced-motion setting disables animations
- [ ] `/confirmed` heading is neutral; no URL-parameter unlock
- [ ] Policy pages return `noindex,nofollow`
- [ ] Webhook remains **disabled** until sandbox round-trip has been signed off (§4)

---

## Test coverage (Bun test)

Files under `src/tests/`:

- `tiers.test.ts` — tier math, GA bump math (server-only), Founder hard cap, no unapproved bullets
- `checkout-url.test.ts` — fail-closed URL resolution, sales gate behavior (off/on, missing per-tier URL), no GA-bump URL surface
- `countdown.test.ts` — pre-target countdown, post-target "started" state that never resets
- `webhook.test.ts` — signature verify (accept/tamper/malformed/missing secret), envelope parsing, allow-listed events, dollars→cents (77.00 → 7700, 49.99 → 4999), strict `payment.succeeded` extraction (status/amount/buyer required), product mapping (bump is not a base tier), GA bump detection via `order_bumps`, redacted payload does not contain buyer PII
- `video-embed.test.ts` — YouTube watch/short/embed + Vimeo normalization, non-allowlisted URLs fail closed
- `calendar-routes.test.ts` — the flat route files that produce `/calendar/day1.ics` and `/calendar/day2.ics` exist; ICS content is well-formed
- `copy.test.ts` — "with me" (not "Ce"), no "Live Q&A both days", real calendar paths on landing + confirmed, GA native-bump copy present, no `$99` on checkout, neutral confirmed heading + "What to bring", JSON-LD has `subEvent` and no `autopilot-challenge.example`, no runtime Google Fonts

---

## Explicit non-goals

- No Stripe. No Stripe code, no Stripe language
- No calls to external services. No secrets embedded in code
- No fake activity, counters, testimonials, or income promises
- No URL-parameter-driven unlocks of `/confirmed`
- No fake GA+bump $99 URL or total; the bump lives inside Commas
- No changes to the NuAmenti project. This project is separate
