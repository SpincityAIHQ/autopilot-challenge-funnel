# Shopify connection diagnostic (read-only) — no changes made

## 1. Is the store connected?

No. There is no native Lovable Shopify integration attached to this project, and
no Shopify credentials exist in the runtime.

Runtime presence (values never read or printed):

| Setting | State |
| --- | --- |
| ACADEMY_SHOPIFY_SHOP | absent (no hostname set) |
| SHOPIFY_CLIENT_ID | absent |
| SHOPIFY_CLIENT_SECRET | absent |
| SHOPIFY_ADMIN_ACCESS_TOKEN | absent |
| ACADEMY_SHOPIFY_WEBHOOK_SECRET | absent |
| ACADEMY_SHOPIFY_AUTH_MODE | absent (unset) |
| ACADEMY_SHOPIFY_ENABLED | absent → webhook route answers 503 |
| ACADEMY_PAID_ACCESS_ENABLED | absent |

Project secret names present: ACADEMY_ACCESS_CODE_SECRET,
ACADEMY_VIMEO_ACCELERATOR_DAY_01, LOVABLE_API_KEY (managed),
RATE_LIMIT_HMAC_SECRET, SUMMIT_OWNER_EMAILS, SUMMIT_OWNER_PASSWORD.
Workspace connectors available: Stripe (live), Stripe (sandbox), Firecrawl —
none linked, and none is a Shopify connector.

## 2. What the code expects

`src/lib/academy-shopify.server.ts` expects an **app-owned custom Shopify app on
the single allowlisted store `64dwd2-0j.myshopify.com`** (any other hostname is
rejected). Two supported modes:

- `client_credentials`: SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET; the client
  secret doubles as the webhook signing secret; the exchanged token must carry
  `read_orders` or `write_orders` or the exchange is rejected.
- `legacy`: SHOPIFY_ADMIN_ACCESS_TOKEN + separate ACADEMY_SHOPIFY_WEBHOOK_SECRET.

With both a legacy token and client credentials present, ACADEMY_SHOPIFY_AUTH_MODE
must be set explicitly or startup fails by design.

## 3. Storefront vs Admin bridge

Two separate things, only the first is live:

- **Storefront checkout (live):** public cart permalinks on spincityhq.com. No
  credentials needed, no order data returned to this app.
- **Admin/webhook bridge (not connected):** Admin GraphQL order reads plus
  HMAC-verified `orders/paid|updated|cancelled` and `refunds/create` webhooks.
  This is what grants entitlements and access codes.

A managed/native connector geared at storefront data does **not** supply what
this app needs: a merchant-installed app on that store with `read_orders` and
a webhook signing secret owned by the same app identity. Nothing in the current
connector UI can provision that here — it must be an owner-created custom app in
the SpinCity Shopify admin, with the values pasted into Project Settings → Secrets.

## 4. Evidence the bridge has never run

academy_orders 0, academy_grants 0, academy_access_codes 0,
academy_commerce_receipts 0. Outbox holds 40 pending/retry rows (unrelated
messaging backlog). So no reconciliation has ever executed.

## 5. Purchase CTA configuration today (for reference, not edited)

- `src/lib/academy.ts` — SUMMIT_OFFERS point at `/api/public/checkout/{ga|vip|vault}`.
- `src/routes/api/public/checkout/$tier.ts` → `src/lib/academy-checkout.server.ts`,
  which currently returns **product pages** (`/products/...`), not the verified
  cart permalinks, when provider = shopify.
- `src/lib/reserve-checkout.ts` + `.env.production` — reserve funnel already uses
  the verified cart permalinks for GA/VIP/Emerald; no Accelerator entry.
- `docs/shopify-funnel-map.md` — funnel table to keep in sync.
- Variant → tier map already correct in `src/lib/academy-commerce.server.ts`:
  50980696129783 ga, 50980697571575 vip, 50980698194167 vault, 51080447492343
  accelerator.

Files that would change to move every CTA onto the verified variants
(GA 50980696129783 $22, VIP 50980697571575 $99, Emerald 50980698194167 $298,
Accelerator 51080447492343 $4,000): `src/lib/academy-checkout.server.ts`,
`src/lib/reserve-checkout.ts`, `.env.production`, `docs/shopify-funnel-map.md`,
and the matching tests in `src/tests/reserve-funnel.test.ts` /
`academy-ghl-payments.test.ts`. **Not edited.**

## 6. Remaining owner-only actions (blocking)

1. In the SpinCity Shopify admin for `64dwd2-0j.myshopify.com`, create/confirm a
   custom app with `read_orders` scope.
2. Save in Project Settings → Secrets: `ACADEMY_SHOPIFY_SHOP` (the store host),
   then either the client ID + client secret pair, or the Admin access token plus
   a webhook secret; set `ACADEMY_SHOPIFY_AUTH_MODE` accordingly.
3. Register the four order webhooks against
   `/api/public/webhooks/shopify` on the production domain.
4. Only then flip `ACADEMY_SHOPIFY_ENABLED` and `ACADEMY_PAID_ACCESS_ENABLED`.

No edits, secret changes, sends, retries, flag changes, or publishing were done.
