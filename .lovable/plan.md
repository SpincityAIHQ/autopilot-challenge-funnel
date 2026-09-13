# Stripe readiness inspection (read-only) — no changes made

## Findings

**Native payment tools: unavailable in this session.** There is no
`recommend_payment_provider`, `enable_stripe_payments`, `enable_paddle_payments`,
or `batch_create_product` in the available tool namespaces. So built-in
Lovable Payments (Stripe/Paddle as merchant of record) cannot be enabled,
checked for merchant approval, or product-configured from here. Merchant
eligibility, account claim, and business verification status are therefore
**not observable** with current tooling.

**Workspace/plan state**
- Plan: Business, subscription active since Sep 5, 2026 — meets the Pro-or-higher
  requirement for payments.
- Billing: payment method and valid billing address on file.
- Backend: Lovable Cloud active (database available for orders/entitlements).

**Existing provider state in this project**
- Workspace connections (none linked to this project): Stripe (live),
  Stripe (sandbox), Firecrawl. These are developer API-key connectors for
  calling Stripe's API — not built-in Lovable Payments, and not merchant approval.
- Project secrets present (names only): ACADEMY_ACCESS_CODE_SECRET,
  ACADEMY_VIMEO_ACCELERATOR_DAY_01, LOVABLE_API_KEY, RATE_LIMIT_HMAC_SECRET,
  SUMMIT_OWNER_EMAILS, SUMMIT_OWNER_PASSWORD. No Stripe or Shopify credentials.
- No Stripe code exists anywhere in `src/`. The only Stripe reference is
  `ACADEMY_GHL_STRIPE_ACCOUNT_ID` (empty) inside the GHL payment adapter.
- Shopify bridge still unconfigured: `ACADEMY_SHOPIFY_ENABLED` and
  `ACADEMY_PAID_ACCESS_ENABLED` are unset, so order reconciliation returns 503.

**Existing checkout/entitlement adapter shape (reusable for Stripe)**
```text
checkout link  -> src/lib/academy-checkout.server.ts (provider switch:
                  ACADEMY_CHECKOUT_PROVIDER = shopify | ghl)
                  routed by src/routes/api/public/checkout/$tier.ts
webhook        -> src/routes/api/public/webhooks/{shopify,ghl-payment}.ts
verify + map   -> academy-commerce.server.ts (HMAC, raw body, variant->tier map)
                  academy-ghl-payments.server.ts (same shape, GHL/Stripe acct)
persist        -> academy_reconcile_order RPC: academy_orders + academy_grants
                  (idempotent on shopify_updated_at, needs_review flag)
deliver        -> academy-delivery.server.ts -> access code -> outbox -> email
gate           -> academy-access.server.ts (ACADEMY_PAID_ACCESS_ENABLED)
```
A Stripe adapter is a third provider branch in this same shape — no rework of
entitlements, codes, delivery or access gating.

## Minimum test-mode implementation (not started)

1. Link the existing **Stripe (sandbox)** workspace connection to this project.
2. Add `academy-stripe.server.ts`: Checkout Session creation for GA $22 /
   VIP $99 / Emerald $298 only (Accelerator stays downstream), plus
   `constructEvent`-style signature verification on the raw body.
3. Add `src/routes/api/public/webhooks/stripe.ts` handling
   `checkout.session.completed` and `charge.refunded`, mapping Stripe price IDs
   to the existing `ga | vip | vault` tiers and calling the existing
   `academy_reconcile_order` RPC unchanged.
4. Extend `ACADEMY_CHECKOUT_PROVIDER` with a `stripe` branch; keep Shopify
   links live until a sandbox purchase-to-access journey passes.
5. Secrets the owner must add: `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET`,
   `ACADEMY_STRIPE_PRICES_JSON`. Flags stay OFF until one sandbox purchase
   reaches lesson access.

## Owner-only next step

Because native payment tools are absent here, the only route to built-in
Stripe (Lovable as merchant of record) is the Payments panel in the Lovable
project UI. If it is not offered there, the sandbox connector path above is
the available option. Nothing was enabled, created, claimed, published, sent or
changed; `/join` recovery fixes untouched.
