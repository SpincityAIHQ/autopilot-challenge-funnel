# Saved-card one-click upgrades — operator guide

One-click turns the post-purchase upsell into a single tap:

> **Add VIP · $77 with Visa •••• 4242**
> _One click authorizes a one-time $77 charge to Visa •••• 4242. No subscription._

It applies to exactly two offers.

| Offer                  | One-click | Why                                                                                |
| ---------------------- | --------- | ---------------------------------------------------------------------------------- |
| $77 VIP upgrade        | Yes       | Small, low-dispute, immediately after a verified GA purchase.                        |
| $199 Vault             | Yes       | Same buyer, same session, still a modest amount.                                     |
| $1,000 Intensive       | **No**    | Real seat inventory, materially larger charge, higher dispute risk. Full checkout.    |

That exclusion is enforced in three places: the product list in
`src/lib/one-click.ts`, a `CHECK` constraint on the table, and a guard at the
top of `begin_one_click_charge`. It is not a UI convention.

---

## Before you switch this on

**The Commas request paths and response field names in `.env.example` are
placeholders, not verified values.** They follow the shape most payment APIs
use, but the live Commas API reference was not readable at the time this was
built, so nothing was hard-coded on a guess.

Until you fill them in and set `COMMAS_ONE_CLICK_ENABLED=true`, the feature is
inert: `getOneClickConfig()` returns `null`, the API reports that one-click is
unavailable, and every buyer sees **Continue to Secure Checkout · $77** instead.
The funnel works exactly as it does today. There is no half-configured state —
if any required value is missing, one-click is off.

So the first task is to open the Commas API reference and confirm four things:

1. The auth header. The adapter sends `Authorization: Bearer <COMMAS_API_KEY>`.
2. The customer-lookup path, and what it returns for an email with no customer.
3. The saved-payment-methods path for a customer.
4. The direct-charge path, its request body, and its status values.

Then map each response field to the `COMMAS_FIELD_*` variables. They accept
dotted paths (`card.last4`), so a naming difference needs no code change.

---

## Configuration

Point everything at the **sandbox** first. Commas provides a separate sandbox
environment where no real card is charged.

```
COMMAS_ONE_CLICK_ENABLED=true
COMMAS_API_KEY=<sandbox key>
COMMAS_API_BASE_URL=https://<sandbox host>
COMMAS_CUSTOMER_LOOKUP_PATH=/v1/customers?email={email}
COMMAS_PAYMENT_METHODS_PATH=/v1/customers/{customerId}/payment_methods
COMMAS_CHARGE_PATH=/v1/charges
```

`{email}` and `{customerId}` are substituted and URL-encoded. The base URL must
be `https://` — an `http://` base is rejected outright so the API key never
travels in clear text.

`RATE_LIMIT_HMAC_SECRET` must also be set. The one-click endpoints fail closed
with HTTP 503 without it, exactly like `/exchange` and `/read`.

---

## What the buyer sees

| Situation                              | Button                                    |
| -------------------------------------- | ----------------------------------------- |
| Saved card found, buyer eligible       | `Add VIP · $77 with Visa •••• 4242`       |
| No saved card                          | `Continue to Secure Checkout · $77`       |
| One-click not configured               | `Continue to Secure Checkout · $77`       |
| Card declined                          | `Continue to Secure Checkout · $77`       |
| Attempt pending or ambiguous           | "Do not click again" notice, no button    |
| Already purchased                      | No offer                                  |

A charge always takes two deliberate taps. The first arms the button
("Tap once more to authorize. Nothing has been charged yet."), the second
sends it. The server independently requires `confirm: true`.

---

## Security model

Everything sensitive stays server-side.

- The API key is read only in `src/lib/commas-one-click.server.ts`. No client
  component imports that module, and a test enforces it.
- Customer ids and payment-method ids never leave the server. The browser
  receives `{ brand, last4 }` and nothing else. `card.customerId` and
  `card.paymentMethodId` are each referenced exactly once in the route — inside
  the arguments passed to Commas — and a test asserts that count.
- `last4` must be exactly four digits or it is dropped, so a misconfigured
  field path cannot push a full card number to the browser.
- The **server** sets the price, from `expectedTotalCents(product)`. A price in
  the request body is ignored.
- The buyer must present a valid `summit_rs` session cookie. The email comes
  from that session, never from the request.
- Ownership of the previous funnel step is checked from live entitlements and
  re-checked inside `begin_one_click_charge`, which is the actual security
  boundary — the API-route check is only a UX affordance.

## Duplicate-charge protection

A row in `public.one_click_charges` must be claimed **before** any money moves.
A partial unique index on `(lower(buyer_email), product)` covering
`status IN ('pending','succeeded','unknown')` means two concurrent clicks
cannot both proceed — the loser is told an attempt is already in flight.

That row's id is also sent to Commas as `Idempotency-Key`, so the database and
Commas agree on what one attempt means.

Outcomes:

| Commas result                              | Stored status | Guard    | Buyer sees                          |
| ------------------------------------------ | ------------- | -------- | ----------------------------------- |
| Explicit success                           | `succeeded`   | held     | Access opens immediately            |
| Explicit decline                           | `failed`      | released | Secure checkout, nothing charged    |
| Timeout, non-2xx, unrecognized status      | `unknown`     | **held** | "Do not click again"                |

Ambiguity never resolves to `failed`. Only a status Commas explicitly reports
as declined releases the guard for a retry, because only that is safe.

If the charge succeeds but fulfillment lags, the attempt is still recorded as
`succeeded` — a fulfillment problem must never reopen the guard. The Commas
webhook for that same payment id finishes the job, and `fulfill_summit_payment`
is idempotent by payment id so it cannot double-grant.

---

## Testing sequence

Run these in order. Do not skip to live.

1. **Migration.** Apply `20260726120000_one_click_charges.sql`.
2. **Off.** With `COMMAS_ONE_CLICK_ENABLED=false`, walk GA → VIP → Vault and
   confirm every button reads "Continue to Secure Checkout" and the funnel
   behaves exactly as before.
3. **Sandbox, no saved card.** Enable with sandbox credentials using a buyer
   who has no stored card. Confirm the fallback still shows.
4. **Sandbox, saved card.** Buy GA with a sandbox card, then confirm the VIP
   button reads `Add VIP · $77 with Visa •••• 4242`. Complete it. Check that
   the VIP entitlement appears immediately and the Vault offer follows.
5. **Duplicate protection.** Click the confirm button twice quickly, and open
   the same page in a second tab and click there too. Exactly one row in
   `one_click_charges`, exactly one charge in the Commas sandbox dashboard.
6. **Decline.** Use a sandbox decline card. Confirm the buyer is offered secure
   checkout and that a genuine retry is possible.
7. **Mobile.** Inspect every page on a real phone. The video autoplays muted,
   the button sits directly beneath it, and it is full-width.
8. **Live.** Only after 5 and 6 pass, swap in live credentials and re-run
   step 4 once with a real card you control, then refund it.

Verify in the Commas dashboard, not only in the app. The dashboard is the
authority on how many charges actually happened.
