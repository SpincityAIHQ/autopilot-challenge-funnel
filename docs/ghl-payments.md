# GHL checkout with Stripe; Lovable course access

This adapter is disabled until real account configuration and payment tests are complete. Creating products, links, or an HTTP receipt does not prove that a customer was charged or that an email arrived.

## Authority and identity

GHL sells the new ticket using its connected Stripe account. A native Payment Received workflow sends only the transaction reference to the app. The app reads the transaction and complete order back from the HighLevel API. Only the configured location, Stripe account, live mode, successful full payment, exact one-time product/price allowlist, currency, and quantity can create an active grant. No browser redirect, tag, workflow amount, email address, or claimed status can grant access.

Order IDs are stored as `ghl:<location>:<order>`. Shopify IDs retain their existing `gid://shopify/Order/...` namespace. Existing Shopify and imported tickets continue through their existing verification and activation paths. The existing database's `shopify_updated_at` column also stores the latest authoritative GHL order/transaction timestamp; no rename or new schema is required.

The existing durable receipt table, locked reconciliation function, one-time code issuance and explicit verified-email activation are reused. Opening a page or buying does not start the lesson-access clock. Activation does. Duplicate readbacks and activations do not extend access or duplicate confirmation.

## Private server configuration

| Variable | Required value |
| --- | --- |
| `ACADEMY_GHL_PRIVATE_TOKEN` | Sub-account Private Integration token with Orders read and Transactions read permissions. Verify these scopes with a real GET before enabling. |
| `ACADEMY_GHL_LOCATION_ID` | The actual GHL sub-account ID. |
| `ACADEMY_GHL_STRIPE_ACCOUNT_ID` | The verified connected Stripe `acct_...` ID from the payment provider/readback. |
| `ACADEMY_GHL_PAYMENT_WEBHOOK_SECRET` | A fresh random secret of at least 32 characters, stored in server Secrets and the workflow's Authorization header. |
| `ACADEMY_GHL_TICKET_PRICES_JSON` | JSON array of `{ "productId": "actual ID", "priceId": "actual ID", "tier": "ga", "amount": 22, "currency": "USD" }`; one entry for each authorized price. |
| `ACADEMY_GHL_PAYMENTS_ENABLED` | `true` only after the above is configured. |
| `ACADEMY_GHL_CHECKOUT_LINKS_JSON` | JSON object mapping `ga`, `vip`, `vault`, `accelerator` to the actual hosted GHL payment links. |
| `ACADEMY_GHL_CHECKOUT_HOSTS` | Exact comma-separated hostnames from those verified links. No wildcard hosts. |
| `ACADEMY_CHECKOUT_PROVIDER` | Set `ghl` only when the GHL customer test passes. Defaults to `shopify` for compatibility. |

The existing paid access, access-code secret, terms, email ownership, and delivery settings are still required. Accelerator terms retain the existing fixed programme end. No Stripe secret API key is needed in this app: the HighLevel private integration reads its own connected provider's payment records.

## Native workflow handoff

1. Use the **Payment Received** trigger. The trigger can include failed payments by default; configure the relevant live products and successful payment filter. Failed events reaching the app still cannot grant access.
2. Use **Custom Webhook**, POST `https://aiautopilotsummit.com/api/public/webhooks/ghl-payment`, `Content-Type: application/json`, and private `Authorization: Bearer <secret>`.
3. Send JSON with the literal configured `location_id` and native `transaction_id` variable `{{payment.transaction_id}}`. No other fields are needed.
4. Set the hosted payment-link success redirect to `https://aiautopilotsummit.com/redeem`. It is a navigation destination, never payment proof.
5. Verify retry/error behavior in native execution history; a `Recorded` response means durable receipt only. The minute scheduler performs reconciliation and messaging.

The webhook performs a current transaction GET before recording, so unavailable GHL verification returns 503. Receipt dedup uses the authoritative transaction ID, update time, status and refund amount. Repeated identical events do not enqueue duplicate receipt work. A later authoritative refund has a different receipt key.

GHL's marketplace-signature protocol is not claimed or emulated here. This is a separately authenticated native workflow handoff.

## Refunds, review and recovery

Full refunds deactivate the grant. Partial refunds, unknown statuses, missing refund state, different account/currency, aggregate parent transactions, subscriptions, multiple successful payments, quantities above one, duplicate lines, unmapped items and discounts below the configured amount are held for review. The adapter does not guess how an installment or partial refund should affect a ticket. Configure a separate reviewed offer before supporting those cases.

Known GHL orders are periodically rechecked by the existing scheduler, up to five oldest orders per pass once older than 15 minutes. This is bounded background recovery, not a guaranteed 15-minute deadline under backlog or provider failure. Entitlement activation and stale access reads also recheck GHL. Connect and test the native refund workflow with its actual transaction-reference field when available; do not invent that field.

API failures keep receipts pending and block stale activation. Current code deliberately rejects incomplete transaction pages and orders with more than ten transactions. Complex cases need staff review, not an optimistic paid state. The API's item schema documentation is partly underspecified; confirm real live and test response shapes before enabling. Strings pretending to be booleans or money are rejected.

If HighLevel supplies a charge snapshot, contradictory IDs, failed/uncaptured payments, test mode, refund discrepancies or a dispute also block a grant. The snapshot is optional and HighLevel does not promise it is fresh for every Stripe dispute. Chargeback synchronization still needs a real provider test; this adapter does not claim automatic chargeback detection merely because refund tests pass.

## Launch proof

- Verify the private token can GET actual GHL orders/transactions in the configured location with `Version: v3`.
- Prove a test-mode order cannot issue a live grant.
- Complete one authorized real GA purchase and verify receipt → authoritative readback → one code → verified inbox → explicit activation → 48-hour access → one confirmation.
- Repeat the same handoff and activation to check idempotency.
- Test full refund, partial refund hold, wrong email, provider outage, and confirmation repair without extending access.
- Recheck a historical Shopify ticket and imported ticket to preserve existing customers.

## Primary references checked 2026-09-10

- [HighLevel Private Integrations](https://marketplace.gohighlevel.com/docs/Authorization/PrivateIntegrationsToken/)
- [Current API versions](https://marketplace.gohighlevel.com/docs/Versioning/)
- [Get Order by ID](https://marketplace.gohighlevel.com/docs/ghl/payments/get-order-by-id/)
- [List Transactions](https://marketplace.gohighlevel.com/docs/ghl/payments/list-transactions/)
- [Get Transaction by ID](https://marketplace.gohighlevel.com/docs/ghl/payments/get-transaction-by-id/)
- [Order item schema and examples](https://marketplace.gohighlevel.com/docs/webhook/OrderCreate/)
- [Native Payment Received workflow variables](https://help.gohighlevel.com/support/solutions/articles/48001238334-workflow-trigger-payment-received)
- [Stripe charge state fields](https://docs.stripe.com/api/charges/object)
