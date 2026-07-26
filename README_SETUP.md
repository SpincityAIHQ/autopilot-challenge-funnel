# AI AutoPilot Summit — Operator Setup

## Locked event

- **Day 1:** Saturday, August 29, 2026 · **1:00–4:00 PM Eastern**
- **Day 2:** Sunday, August 30, 2026 · **1:00–4:00 PM Eastern**
- **Room opens:** 12:45 PM Eastern both days
- **VIP Build Lab:** Sunday, August 30 · **4:15–5:45 PM Eastern**, immediately after Day 2

## Product ladder

| Product | Price | Entry rule |
|---|---:|---|
| General Admission | $22 | Public `/checkout` |
| VIP Implementation Experience | $77 | Verified GA required |
| AI AutoPilot Implementation Vault | $199 | Verified VIP required |
| Strategy & Build Intensive | $1,000 | Verified Vault/approved eligibility; 10 real slots |

The public landing page shows no prices. Each paid option appears only after the
previous purchase is verified.

## Video-first page order

Every funnel page is mobile-first:

1. Headline
2. Responsive 16:9 video
3. Join or upgrade action directly under the video
4. Respectful “No thanks” action on optional offers
5. Detailed copy, benefits, proof, and FAQs below

The landing hero is specifically:

`headline → VSL → Reserve Your Seat → supporting copy`

Funnel videos request muted autoplay and inline playback. Controls stay visible
so the viewer can tap for sound. Empty video slots are hidden publicly and
shown only as labeled placeholders in private owner QA.

## Public routes

1. `/` — no-price landing page
2. `/checkout` — $22 GA only
3. `/confirmed` — verified GA/VIP welcome and direct next action
4. `/offer/vip-upgrade` — full $77 VIP page
5. `/offer/implementation-vault` — verified VIP welcome + $199 Vault
6. `/strategy-intensive` — verified Vault welcome + $1,000 full checkout
7. `/next-steps` — exact GA, VIP, Vault, or Intensive confirmation
8. `/resources` — verified resource hub
9. `/communication-preferences` — separate email/SMS/AI-call preferences
10. `/privacy`, `/terms`, `/refund-policy`

A URL, query parameter, or redirect never proves purchase. Product visibility,
one-click eligibility, and resources come from the verified HttpOnly Summit
session and active entitlements.

## Commas payment behavior

### GA — normal checkout

GA always uses a secure Commas checkout link. This is where the customer enters
contact and card information.

### VIP and Vault — one click when eligible

Commas supports charging an existing customer’s saved payment method directly.
This funnel uses that capability only for:

- VIP — $77
- Vault — $199

The button shows the exact amount and safe card label before the buyer clicks:

`Add VIP · $77 with Visa •••• 4242`

That one click is the explicit authorization for the displayed one-time charge.
The browser never receives the Commas API key, customer ID, payment-method ID,
buyer email, amount authority, or full card data.

When no saved card is available, the API is unavailable, or a saved-card charge
is declined, the normal Commas checkout link remains the fallback.

### Intensive — full checkout only

The $1,000 Intensive never uses one-click charging. It keeps a full Commas
checkout because it has hard-cap seat inventory and materially higher
chargeback risk.

## Checkout URLs and success returns

| Product | Browser env | Success return |
|---|---|---|
| GA | `VITE_COMMAS_CHECKOUT_URL_GA` | `/confirmed` |
| VIP | `VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE` | `/offer/implementation-vault` |
| Vault | `VITE_COMMAS_CHECKOUT_URL_VAULT` | `/strategy-intensive` |
| Intensive | `VITE_COMMAS_CHECKOUT_URL_INTENSIVE` | `/next-steps` |

The VIP and Vault links remain required even when one-click is enabled because
they are the secure fallback.

## Browser-visible environment

```text
VITE_SUMMIT_SALES_ENABLED=false
VITE_SUMMIT_LEGAL_READY=false
VITE_SUMMIT_UPSELLS_ENABLED=false
VITE_SUMMIT_INTENSIVE_SALES_ENABLED=false
VITE_SUMMIT_QA_REVIEW=false

VITE_COMMAS_CHECKOUT_URL_GA=
VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE=
VITE_COMMAS_CHECKOUT_URL_VAULT=
VITE_COMMAS_CHECKOUT_URL_INTENSIVE=
```

### Funnel video slots

```text
VITE_SUMMIT_VIDEO_HERO=
VITE_SUMMIT_VIDEO_CHECKOUT=
VITE_SUMMIT_VIDEO_VIP_OFFER=
VITE_SUMMIT_VIDEO_THANK_YOU=
VITE_SUMMIT_VIDEO_THANK_YOU_GA=
VITE_SUMMIT_VIDEO_THANK_YOU_VIP=
VITE_SUMMIT_VIDEO_THANK_YOU_VAULT=
VITE_SUMMIT_VIDEO_THANK_YOU_INTENSIVE=
VITE_SUMMIT_VIDEO_EXIT_GA=
VITE_SUMMIT_VIDEO_EXIT_VIP=
VITE_SUMMIT_VIDEO_EXIT_VAULT=
VITE_SUMMIT_VIDEO_EXIT_INTENSIVE=
```

Only approved YouTube or Vimeo HTTPS URLs render.

## Server-only environment

### Signed webhook

```text
COMMAS_WEBHOOKS_ENABLED=false
COMMAS_WEBHOOK_SECRET=
COMMAS_PRODUCT_ID_GA=
COMMAS_PRODUCT_ID_VIP_UPGRADE=
COMMAS_PRODUCT_ID_VAULT=
COMMAS_PRODUCT_ID_INTENSIVE=
RATE_LIMIT_HMAC_SECRET=
```

### Saved-card one click

```text
COMMAS_ONE_CLICK_ENABLED=false
COMMAS_API_ENV=sandbox
COMMAS_API_KEY=
```

The service IDs come from `COMMAS_PRODUCT_ID_VIP_UPGRADE` and
`COMMAS_PRODUCT_ID_VAULT`.

Start in sandbox. The one-click route:

1. Requires same-origin request and rate limit.
2. Derives buyer identity from the HttpOnly session.
3. Checks prior entitlements.
4. Finds the exact Commas customer and default saved card.
5. Returns only brand + last four for display.
6. Reserves a duplicate-safe attempt in Supabase.
7. Charges Commas with an `Idempotency-Key`.
8. Immediately calls the same idempotent `fulfill_summit_payment` RPC used by
   the signed webhook.
9. Treats the later webhook as a safe replay of the same payment ID.

Unknown charge status blocks another attempt and tells the buyer not to retry.

See `docs/video-first-and-one-click-setup.md` for the full sandbox matrix.

## Verified access model

- `fulfill_summit_payment` grants the purchased entitlement and enforces the
  GA → VIP → Vault → Intensive graph.
- Single-use access links exchange into a short-lived HttpOnly `summit_rs`
  session cookie.
- `session_active_scopes` rechecks current access on every protected action.
- Refunds revoke only the entitlement tied to the reversed payment ID.
- One-click audit rows are server-only and protected by RLS.

## Email segmentation

Mailchimp uses one audience, `SUMMITLVL`, cumulative purchase tags, and one
active `CURRENT` tag:

- `CURRENT · GA`
- `CURRENT · VIP`
- `CURRENT · VAULT`
- `CURRENT · INTENSIVE`

A verified purchase stops sales messages for products the buyer already owns.

## Private QA

Open the private preview with:

`/?qaStage=anonymous`

The browser-only QA path walks the full funnel without calling Commas, creating
orders, granting entitlements, or changing seat inventory.

## P0 launch sequence

1. Final legal review.
2. Create all four Commas products and success returns.
3. Configure and test signed webhooks.
4. Configure verified access email/session flow.
5. Apply the one-click audit migration.
6. Test GA → VIP → Vault in Commas sandbox, including duplicate and failure cases.
7. Test Intensive full checkout and real 10-seat inventory.
8. Test every final video on real iPhone and Android devices.
9. Configure Mailchimp, SMS, and AI-call systems only after consent requirements are complete.
10. Run one controlled internal live purchase before public launch.

## Validation

```bash
bun test src/tests/
bunx tsc --noEmit
bun run build
scripts/scan-assets.sh
psql -v ON_ERROR_STOP=1 -f scripts/verify-resource-sessions.sql
```
