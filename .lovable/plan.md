# Stripe readiness inspection (read-only) — no changes made

## Corrected readiness summary

Built-in Stripe on Lovable is a **payment service provider** integration, with
Stripe Managed Payments as an **optional** add-on. It is not "Lovable as
merchant of record"; any earlier wording to that effect was wrong and is removed.

- Plan and backend requirements **appear met**: Business plan active, payment
  method and billing address on file, Lovable Cloud database available.
- **Unverified:** merchant approval, this project's exact payment-management
  role, and whether any Stripe account is actually connected to this project.
- Native payment eligibility/enable tools (`recommend_payment_provider`,
  `enable_stripe_payments`, `batch_create_product`) are **not available in this
  session**, so merchant approval, account claim, and business verification
  status cannot be observed from here.
- An externally verified `list_custom_connectors` returned **zero**. The
  workspace catalog entries named "Stripe (live)" and "Stripe (sandbox)" are
  therefore **not** established connected accounts and must not be read as one.
  Neither is linked to this project.

## Current project payment state

- No Stripe code anywhere in `src/`. Only reference is an empty
  `ACADEMY_GHL_STRIPE_ACCOUNT_ID` inside the GHL adapter.
- Project secrets (names only): ACADEMY_ACCESS_CODE_SECRET,
  ACADEMY_VIMEO_ACCELERATOR_DAY_01, LOVABLE_API_KEY, RATE_LIMIT_HMAC_SECRET,
  SUMMIT_OWNER_EMAILS, SUMMIT_OWNER_PASSWORD. No Stripe or Shopify credentials.
- Shopify bridge unconfigured: `ACADEMY_SHOPIFY_ENABLED` and
  `ACADEMY_PAID_ACCESS_ENABLED` unset, reconciliation returns 503.
- Owner reports **no working checkout today**. The current Shopify links are
  therefore treated as broken, not as a fallback to keep live.

## Existing adapter shape (observed, not endorsed for reuse)

```text
checkout link  -> src/lib/academy-checkout.server.ts (ACADEMY_CHECKOUT_PROVIDER)
                  routed by src/routes/api/public/checkout/$tier.ts
webhook        -> src/routes/api/public/webhooks/{shopify,ghl-payment}.ts
verify + map   -> academy-commerce.server.ts, academy-ghl-payments.server.ts
persist        -> academy_reconcile_order RPC -> academy_orders, academy_grants
deliver        -> academy-delivery.server.ts -> access code -> outbox -> email
gate           -> academy-access.server.ts (ACADEMY_PAID_ACCESS_ENABLED)
```

`academy_reconcile_order` is Shopify-shaped (order/line/variant identifiers,
`shopify_updated_at` ordering). Whether it can serve Stripe is **unknown until
inspected**; no claim of unchanged reuse is made here.

## Owner-only blocker (exact next step)

Open this project's **More > Payments > Stripe** and complete the actual
provider setup and account claim/verification form there. Native setup tools are
unavailable in this session, so nothing further can proceed until that shows a
connected, approved Stripe account and the project's payment-management role.

## Fallback only — not approved, not started

If built-in Stripe turns out to be unavailable to this project, a custom adapter
would be considered separately. Any such work would have to require:

- entitlement granted only on **verified paid** status, never on redirect
- asynchronous payment **success and failure** handling (delayed/pending methods)
- refund, dispute and cancellation reconciliation
- provider-qualified idempotency keys (event id scoped per provider and mode)
- strict **test/live separation** of keys, webhooks, prices and granted access
- a prior inspection of `academy_reconcile_order` before any reuse

Webinar scope stays GA / VIP / Emerald Summit replays; Accelerator is downstream.

Nothing was enabled, created, claimed, linked, published, sent or changed. The
`/join` recovery fixes are untouched. This note is the only file edited.
