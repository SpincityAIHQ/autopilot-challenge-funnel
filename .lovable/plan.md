# Purchase-activation diagnosis (read-only)

No code, settings, keys, or messages were changed. No values are shown below — only names and presence.

## What the app currently has configured

Stored secrets in this project (names only): `ACADEMY_VIMEO_ACCELERATOR_DAY_01`, `LOVABLE_API_KEY`, `RATE_LIMIT_HMAC_SECRET`, `SUMMIT_OWNER_EMAILS`, `SUMMIT_OWNER_PASSWORD`.

Purchase-activation settings, all absent or off:

| Setting | Present | Effect |
| --- | --- | --- |
| `ACADEMY_SHOPIFY_SHOP` | no | store cannot be contacted |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | no | orders cannot be read back |
| `ACADEMY_SHOPIFY_WEBHOOK_SECRET` | no | incoming order notices rejected |
| `ACADEMY_SHOPIFY_ENABLED` (webhook flag in `academy-commerce.server.ts`) | no (defaults off) | webhook returns 503 before any work |
| `ACADEMY_PAID_ACCESS_ENABLED` | no | paid access off |
| `ACADEMY_ACCESS_CODES_ENABLED` | no | no codes issued |
| `ACADEMY_ACCESS_CODE_SECRET` | no | code generation impossible (needs 32+ chars) |
| `ACADEMY_ACCESS_TERMS_JSON` | no | no approved tier hours/version exist to report |
| `ACADEMY_ACCESS_EMAIL_ENABLED` | no | access email path returns `not_enabled` |
| `ACADEMY_GHL_ACCESS_WEBHOOK_URL` | no (general `ACADEMY_GHL_WEBHOOK_URL` present) | access email would fall back to the general hook |

Non-secret checkout links are configured for the storefront host `spincityhq.com` with three cart variant IDs (GA, VIP, Vault); a fourth Accelerator variant ID is mapped in code but has no configured link.

## Why the symptoms occur

- `accessDelivery.accessEmail = 'not_enabled'`: `deliverAccessCodes()` requires all of code issuance ready (codes flag + paid access flag + 32-char secret), `ACADEMY_ACCESS_EMAIL_ENABLED=true`, and an allowed GHL hook URL. Several of those are unset, so it exits before touching the queue. The GHL success you see is the separate welcome/CRM path, which is already live.
- Zero orders and codes: the Shopify webhook route rejects every delivery because the enabled flag and webhook secret are unset, so nothing is ever recorded, reconciled, or issued. Database confirms 0 orders, 0 grants, 0 codes, 0 deliveries, 0 webhook receipts. 35 imported tickets and 1 scheduler credential do exist.

## Shopify subscription verifiability

Not verifiable from here. There is no Shopify connector in this workspace (only Stripe live, Stripe sandbox, Firecrawl) and no admin token, so webhook subscriptions on the store cannot be listed. They can only be confirmed inside the Shopify admin, or by this app once an admin token exists.

## Concrete list of what is missing to activate purchases

1. `ACADEMY_SHOPIFY_SHOP` — the real `*.myshopify.com` hostname.
2. `SHOPIFY_ADMIN_ACCESS_TOKEN` — Admin API token with order read scope.
3. `ACADEMY_SHOPIFY_WEBHOOK_SECRET` — the same signing secret set on the store's webhooks.
4. `ACADEMY_SHOPIFY_ENABLED=true`.
5. `ACADEMY_ACCESS_CODE_SECRET` — a dedicated 32+ character random server secret.
6. `ACADEMY_ACCESS_TERMS_JSON` — approved per-tier `hours`, `starts: "redemption"`, `version`. Nothing exists today and durations must not be invented.
7. `ACADEMY_ACCESS_CODES_ENABLED=true`, then `ACADEMY_PAID_ACCESS_ENABLED=true`.
8. `ACADEMY_ACCESS_EMAIL_ENABLED=true` and `ACADEMY_GHL_ACCESS_WEBHOOK_URL` for the transactional access-code workflow.
9. On the store: subscribe `orders/paid`, `orders/updated`, `orders/cancelled`, `refunds/create` to `/api/public/webhooks/shopify`.
10. Confirm the Accelerator product's checkout link, since only three cart links are configured.

## Secure path to complete them

All of items 1–8 are entered in this project's own settings under Project Settings → Secrets, which stores them server-side only; nothing is added to the browser bundle. Items 9 and 10 are done in the Shopify admin by the store owner. Recommended order: store values first, subscribe the webhooks, then flip the four enable flags last so no half-configured purchase can grant access.

## Suggested next step after approval

A verification-only pass: confirm the settings are present, replay one real paid test order through reconciliation, and check that a code and an access email are produced — with no publishing and no outbound marketing sends.
