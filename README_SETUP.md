# AI AutoPilot Summit — Operator Setup

The AI AutoPilot Summit is a two-day live online implementation event on
**August 24 and 25, 2026**. Exact session start times are announced to
registrants closer to the event and are never invented in code. This app is a
standalone Lovable Cloud project — it does not share code, routes, tables,
domains, or payment products with the NuAmenti application.

## Product catalog (sequential ascension funnel)

| Product                                | Price     | Notes                                                         |
| -------------------------------------- | --------- | ------------------------------------------------------------- |
| General Admission (GA)                 | $22       | Public /checkout. Two live days + Action Guide, scorecard, canvas. |
| VIP Implementation Experience          | $77       | Post-GA at /offer/vip-upgrade. 30-day recordings, VIP Lab, priority Q&A. |
| AI AutoPilot Implementation Vault      | $199      | Post-VIP at /offer/implementation-vault. Independent library add-on. |
| Strategy & Build Intensive             | $1,000    | Post-Vault at /strategy-intensive. Two-hour private session; **cap 10 total**, atomic inventory. |
| Eight-Week Mentorship & Work-Along     | $8,000    | Application-based at /apply/mentorship. Separate from the Intensive. |
| Next NuAmenti Keynote                  | TBA       | Priority-access waitlist at /next-keynote. Rendered as "coming soon" until configured. |

Direct-VIP admission is **not** a current sale product. VIP is only sold as
the sequential `vip_upgrade` after a verified GA purchase.

No income promises, no guaranteed business outcomes, no fake scarcity or
testimonials anywhere.

## Public funnel

1. `/` — landing / sales (no prices, no downstream links)
2. `/checkout` — GA only ($22); any legacy `?tier=vip` is ignored and normalized to GA
3. `/confirmed` — warm truthful "we are verifying your payment" state; product-specific gratitude only after a verified HttpOnly session
4. `/offer/vip-upgrade` — $77 VIP Implementation Experience (verified GA required)
5. `/offer/implementation-vault` — $199 Vault add-on (verified VIP required)
6. `/strategy-intensive` — $1,000 Intensive (verified Vault required, cap 10)
7. `/apply/mentorship` — $8,000 application (separate from Intensive)
8. `/next-keynote` — next-keynote priority-access / waitlist
9. `/communication-preferences` — three separate opt-in channels
10. `/privacy`, `/terms`, `/refund-policy` — pre-launch drafts (noindex)
11. `/resources` — server-validated resource hub gated by HttpOnly session

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
| `VITE_SUMMIT_SALES_ENABLED`             | GA checkout master gate                       |
| `VITE_SUMMIT_LEGAL_READY`               | Independent legal gate — must be `true`        |
| `VITE_SUMMIT_UPSELLS_ENABLED`           | VIP Upgrade + Vault gate                      |
| `VITE_SUMMIT_INTENSIVE_SALES_ENABLED`   | Strategy & Build Intensive gate               |
| `VITE_SUMMIT_MENTORSHIP_APPLICATIONS_ENABLED` | Mentorship application gate             |
| `VITE_COMMAS_CHECKOUT_URL_GA`           | FanBasis GA checkout — $22                     |
| `VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE`  | FanBasis VIP Implementation Experience — $77   |
| `VITE_COMMAS_CHECKOUT_URL_VAULT`        | FanBasis Vault — $199                          |
| `VITE_COMMAS_CHECKOUT_URL_INTENSIVE`    | FanBasis Intensive — $1,000                    |
| `VITE_COMMAS_CHECKOUT_URL_KEYNOTE`      | Next keynote checkout (also needs date)       |
| `VITE_KEYNOTE_DATE_ISO`                 | Next keynote date (enables the /next-keynote card) |
| `VITE_KEYNOTE_PRICE_LABEL`              | Optional display price for keynote            |
| `VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS`    | Comma-separated extra allowlisted hosts       |
| `VITE_SUMMIT_VIDEO_HERO`                | Approved hero VSL embed URL                   |
| `VITE_SUMMIT_VIDEO_THANK_YOU`           | Approved confirmation thank-you embed URL     |
| `VITE_SUMMIT_VIDEO_THANK_YOU_GA` / `_VIP` / `_VAULT` / `_INTENSIVE` | Optional per-product verified-only thank-you videos |

`VITE_COMMAS_CHECKOUT_URL_VIP` and `COMMAS_PRODUCT_ID_VIP` are intentionally
**removed** from current activation. Anything already set is ignored by
`getCommasConfig()` and by `resolveProductFromItem()`.

FanBasis product-success return URLs (configured inside FanBasis, not here):

```text
GA:            https://<domain>/confirmed
VIP Upgrade:   https://<domain>/offer/implementation-vault
Vault:         https://<domain>/strategy-intensive
Intensive:     https://<domain>/next-steps
```

None of these URLs prove purchase; they are display redirects only. Actual
fulfillment happens via the signed `payment.succeeded` webhook.

Set the Intensive inventory to exactly **10** at FanBasis. The database cap
protects fulfillment, but the provider cap prevents an 11th purchase.

## Server-only environment

Payment webhook and Supabase server client. Webhook remains OFF until all
required variables are set. Nothing is called if any is missing.

- `COMMAS_WEBHOOKS_ENABLED=true`
- `COMMAS_WEBHOOK_SECRET`
- `COMMAS_PRODUCT_ID_GA`
- `COMMAS_PRODUCT_ID_VIP_UPGRADE`
- `COMMAS_PRODUCT_ID_VAULT`
- `COMMAS_PRODUCT_ID_INTENSIVE`

All four product IDs must be distinct. Server-side prices reconcile in cents
to $22 / $77 / $199 / $1,000; unknown products, mismatched totals, or
non-USD grant nothing. Legacy direct-VIP `payment.succeeded` events do not
fulfill — reversal (`payment.refunded/failed/disputed`) is matched by
`payment_id` and remains available for already-recorded legacy VIP rows.

Signed-return bridge (redirect state signing on the way back from FanBasis)
is **BLOCKED** until FanBasis confirms the exact metadata / custom-field
name used for first- and last-touch attribution. Until then the server
persists `null` for attribution and never trusts query-string state.

Provider adapters (Mailchimp, SMS, AI-call) are **defined but disabled**.
They only take effect after operator-supplied credentials and template IDs
are added and verified. This app does not send emails, texts, or calls until
that step is complete.

## Communication preferences

`/communication-preferences` derives identity from the HttpOnly session and
writes one row per channel to `public.marketing_consents` (email, SMS,
AI-assisted/prerecorded calls). Each row records `granted`, `granted_at`,
`revoked_at`, `source`, `copy_version` (`2026-07-25-v1`), and (for SMS/AI-call)
`phone`. AI-call opt-in requires an e-signature. Marketing consent is never
a condition of purchase. Transactional access messages are separate.

## Verified access model

- Fulfillment (`fulfill_summit_payment`) creates the registration and grants
  scoped entitlements tagged with `source_payment_id`. VIP upgrade requires
  an existing GA on the same email; Vault requires an active VIP scope;
  Intensive requires an active Vault scope (or an operator-listed
  eligibility row).
- Access tokens are single-use hashed magic links stored in `access_tokens`.
- The magic-link URL format is `https://<domain>/resources/<slug>#t=<raw>`.
  Raw tokens live only in the fragment (never sent to the server) and are
  stripped from `window.location` immediately after the client POSTs them
  to `/api/public/resources/exchange`.
- Exchange mints a short-lived hashed `resource_sessions` row; the raw
  session token is returned exclusively as an HttpOnly cookie.
- `session_active_scopes` returns the buyer's currently active scopes so
  refunds and revocations take effect immediately.
- Refunds (`reverse_summit_payment`) revoke only the entitlement tied to the
  reversed `source_payment_id`. Independent purchases are preserved.

Confirmed / OTO / Intensive pages render generic operator-verification copy
for anonymous visitors and only reveal product-specific thank-you content
after the entitlement summary confirms the required prior scope.

## Pre-launch checklist (P0)

- [ ] **Legal**: finalize and publish counsel-approved privacy, terms, and
      refund window at `/privacy`, `/terms`, `/refund-policy`; flip
      `VITE_SUMMIT_LEGAL_READY=true`.
- [ ] **Payments**: create the four current FanBasis products, distinct IDs,
      exact success returns, inventory cap 10 on Intensive, one full signed
      webhook round-trip per product.
- [ ] **Verified access**: send and receive a real NuAmenti access email
      end-to-end for GA, VIP Upgrade, Vault, and Intensive; verify the
      magic-link (`#t=`) exchange lands a scoped HttpOnly session.
- [ ] **Communication preferences**: test opt-in, opt-out, phone-required
      logic for SMS and AI-call (with e-signature), STOP/HELP wiring, and
      that revocation writes a new row rather than deleting history.
- [ ] **Adapters**: Mailchimp audience/tags, SMS provider, AI-call provider
      credentials verified before flipping any sender ON.
- [ ] **QA scripts**: run `bun test`, `bunx tsc --noEmit`, `bun run build`,
      `psql -v ON_ERROR_STOP=1 -f scripts/verify-resource-sessions.sql`,
      and `scripts/scan-assets.sh` — all green.
- [ ] **Domain + mobile**: attach domain to this project only; test every
      route on desktop and a real phone with reduced-motion enabled.
- [ ] Republish only after all of the above pass.

## Validation

```text
bun test                              → all tests pass
bunx tsc --noEmit                     → clean
bun run build                         → clean
scripts/scan-assets.sh                → 0 paid-content leaks, 0 stale hits
scripts/verify-resource-sessions.sql  → all scenarios pass, 0 rows persisted
```
