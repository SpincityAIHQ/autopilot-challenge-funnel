# AI AutoPilot Summit — Operator Setup

The AI AutoPilot Summit is a two-day live online implementation event on
**August 24 and 25, 2026**. Exact session start times are announced to
registrants closer to the event and are never invented in code. This app is a
standalone Lovable Cloud project — it does not share code, routes, tables,
domains, or payment products with the NuAmenti application.

## Product catalog

| Product                                | Price     | Notes                                                         |
| -------------------------------------- | --------- | ------------------------------------------------------------- |
| General Admission (GA)                 | $22       | Two live days + Action Guide, scorecard, canvas. No recordings. |
| VIP Experience                         | $77       | GA + 30-day recordings, VIP Implementation Lab, priority Q&A.   |
| VIP Upgrade (GA → VIP)                 | $77       | OTO. Requires existing GA registration on same email.           |
| AI AutoPilot Implementation Vault      | $199      | Independent library add-on. Does NOT include admission or recordings. |
| Strategy & Build Intensive             | $1,000    | Two-hour private session. Hard cap **10 total**, atomic inventory. |
| Eight-Week Mentorship & Work-Along     | $8,000    | Application-based. Separate from the Intensive.                 |
| Next NuAmenti Keynote                  | TBA       | Priority-access waitlist. Rendered as "coming soon" until configured. |

No income promises, no guaranteed business outcomes, no fake scarcity or
testimonials anywhere.

## Public funnel

1. `/` — landing / sales
2. `/checkout?tier=ga|vip` — order summary + FanBasis handoff (GA / VIP only)
3. `/confirmed?tier=ga|vip` — warm truthful "we're verifying your payment" state
4. `/offer/vip-upgrade` — GA-only $77 upgrade (eligibility-gated)
5. `/offer/implementation-vault` — $199 Vault add-on (registered attendees only)
6. `/next-keynote` — next-keynote priority-access / waitlist
7. `/strategy-intensive` — $1,000 Intensive (10 total, verified attendees only)
8. `/offer/mentorship` — application-based mentorship
9. `/offer/keynote` — configured-only keynote OTO
10. `/communication-preferences` — three separate opt-in channels
11. `/privacy`, `/terms`, `/refund-policy` — pre-launch drafts (noindex)
12. `/resources` — server-validated resource hub gated by HttpOnly session

`?tier=` in the URL is display context only. It never proves purchase or
unlocks anything. Authority for entry, links, and paid resources is the
NuAmenti verification + access email plus the resulting HttpOnly session.

## Browser-visible environment (all default OFF)

Sales gates fail closed — the app does not present checkout unless the
corresponding gate is `true` **and** the checkout URL passes the HTTPS
allowlist (`www.fanbasis.com` plus any hosts in
`VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS`).

| Variable                                | Purpose                                       |
| --------------------------------------- | --------------------------------------------- |
| `VITE_SUMMIT_SALES_ENABLED`             | GA + VIP checkout master gate                 |
| `VITE_SUMMIT_UPSELLS_ENABLED`           | VIP Upgrade + Vault gate                      |
| `VITE_SUMMIT_INTENSIVE_SALES_ENABLED`   | Strategy & Build Intensive gate               |
| `VITE_COMMAS_CHECKOUT_URL_GA`           | FanBasis GA checkout — $22                     |
| `VITE_COMMAS_CHECKOUT_URL_VIP`          | FanBasis VIP checkout — $77                    |
| `VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE`  | FanBasis VIP Upgrade — $55                     |
| `VITE_COMMAS_CHECKOUT_URL_VAULT`        | FanBasis Vault — $199                          |
| `VITE_COMMAS_CHECKOUT_URL_INTENSIVE`    | FanBasis Intensive — $1,000                    |
| `VITE_COMMAS_CHECKOUT_URL_KEYNOTE`      | Next keynote checkout (also needs date)       |
| `VITE_KEYNOTE_DATE_ISO`                 | Next keynote date (enables the /offer/keynote card) |
| `VITE_KEYNOTE_PRICE_LABEL`              | Optional display price for keynote            |
| `VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS`    | Comma-separated extra allowlisted hosts       |
| `VITE_SUMMIT_VIDEO_HERO`                | Approved hero VSL embed URL                   |
| `VITE_SUMMIT_VIDEO_THANK_YOU`           | Approved confirmation thank-you embed URL     |

FanBasis product-success return URLs (configured inside FanBasis, not here):

```text
GA:             https://<domain>/confirmed?tier=ga
VIP:            https://<domain>/confirmed?tier=vip
VIP Upgrade:    https://<domain>/confirmed?tier=vip
Vault:          https://<domain>/next-keynote
Intensive:      https://<domain>/next-keynote
```

Set the Intensive inventory to exactly **10** at FanBasis. The database cap
protects fulfillment, but the provider cap prevents an 11th purchase.

## Server-only environment

Payment webhook and Supabase server client. Webhook remains OFF until all
required variables are set. Nothing is called if any is missing.

- `COMMAS_WEBHOOKS_ENABLED=true`
- `COMMAS_WEBHOOK_SECRET`
- `COMMAS_PRODUCT_ID_GA`
- `COMMAS_PRODUCT_ID_VIP`
- `COMMAS_PRODUCT_ID_VIP_UPGRADE`
- `COMMAS_PRODUCT_ID_VAULT`
- `COMMAS_PRODUCT_ID_INTENSIVE`

All five product IDs must be distinct. Prices reconcile in cents to $22 / $77
/ $55 / $199 / $1,000; unknown products, mismatched totals, or non-USD grant
nothing.

Provider adapters (Mailchimp, SMS, AI-call) are **defined but disabled**.
They only take effect after operator-supplied credentials and template IDs
are added and verified. This app does not send emails, texts, or calls until
that step is complete.

## Communication preferences

`/communication-preferences` writes one row per channel to
`public.marketing_consents` (email, SMS, AI-assisted/prerecorded calls). Each
row records `granted`, `granted_at`, `revoked_at`, `source`, `copy_version`,
and (for SMS/AI-call) `phone`. Marketing consent is never a condition of
purchase. Transactional access messages are separate and continue while a
ticket is active.

## Verified access model

- Fulfillment (`fulfill_summit_payment`) creates the registration and grants
  scoped entitlements. VIP upgrade requires an existing GA on the same email.
- Access tokens are single-use hashed magic links stored in `access_tokens`.
- Exchange (`exchange_access_token`) marks a token used and mints a
  short-lived hashed `resource_sessions` row. The client only ever sees the
  HttpOnly session cookie.
- `session_active_scopes` returns the buyer's currently active scopes so
  refunds and revocations take effect immediately.
- Refunds (`reverse_summit_payment`) revoke only the entitlement tied to the
  reversed payment. Independent purchases (e.g. a separately paid Vault) are
  preserved when GA is refunded, and vice versa. VIP-upgrade refunds
  preserve GA and revoke VIP.

## Pre-launch checklist (P0)

- [ ] **Legal**: finalize and publish counsel-approved privacy, terms,
      refund window, and Intensive slot-release language. Checkout stays
      OFF until posted and accepted at checkout.
- [ ] **Payments**: create the five FanBasis products, distinct IDs, exact
      success returns, inventory cap 10 on Intensive, one full signed
      webhook round-trip per product.
- [ ] **Verified access**: send and receive a real NuAmenti access email
      end-to-end for GA, VIP, VIP upgrade, Vault, and Intensive; verify the
      magic-link exchange lands a scoped HttpOnly session.
- [ ] **Communication preferences**: test opt-in, opt-out, phone-required
      logic for SMS and AI-call, STOP/HELP wiring, and that revocation
      writes a new row rather than deleting history.
- [ ] **Adapters**: Mailchimp audience/tags, SMS provider, AI-call provider
      credentials verified before flipping any sender ON.
- [ ] **QA scripts**: run `bun test`, `bunx tsgo --noEmit`, `bun run build`,
      `psql -v ON_ERROR_STOP=1 -f scripts/verify-resource-sessions.sql`, and
      `scripts/scan-assets.sh` — all green.
- [ ] **Domain + mobile**: attach domain to this project only; test every
      route on desktop and a real phone with reduced-motion enabled.
- [ ] Republish only after all of the above pass.

## Validation

```text
bun test                              → all tests pass
bunx tsgo --noEmit                    → clean
bun run build                         → clean
scripts/scan-assets.sh                → 0 paid-content leaks, 0 stale hits
scripts/verify-resource-sessions.sql  → all scenarios pass, 0 rows persisted
```
