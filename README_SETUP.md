# AI AutoPilot Summit — Operator Setup

The AI AutoPilot Summit is a two-day live online implementation event:

- **Day 1:** Saturday, August 29, 2026 · **1:00–4:00 PM Eastern**
- **Day 2:** Sunday, August 30, 2026 · **1:00–4:00 PM Eastern**
- **Room opens:** 12:45 PM Eastern both days
- **VIP Build Lab:** Thursday, September 3, 2026 · **7:00–9:00 PM Eastern**

This app is a standalone Lovable Cloud project — it does not share code,
routes, tables, domains, or payment products with the NuAmenti application.

## Product catalog (sequential ascension funnel)

| Product                                | Price     | Notes                                                         |
| -------------------------------------- | --------- | ------------------------------------------------------------- |
| General Admission (GA)                 | $22       | Public `/checkout`. Both live Summit days, maps, workbook, and build plan. |
| VIP Implementation Experience          | $77       | Post-GA at `/offer/vip-upgrade`. 30-day recordings, VIP Build Lab Sep 3 at 7–9 PM ET, priority Q&A. |
| AI AutoPilot Implementation Vault      | $199      | Post-VIP at `/offer/implementation-vault`. Reusable operating library. |
| Strategy & Build Intensive             | $1,000    | Post-Vault at `/strategy-intensive`. Two-hour private session; **cap 10 total**, atomic inventory. |
| Eight-Week Mentorship & Work-Along     | $8,000    | Application-based at `/apply/mentorship`. Separate from the Intensive. |
| Next NuAmenti Keynote                  | TBA       | Priority-access waitlist at `/next-keynote`. Rendered as "coming soon" until configured. |

Direct-VIP admission is **not** a current sale product. VIP is only sold as
the sequential `vip_upgrade` after a verified GA purchase.

No income promises, no guaranteed business outcomes, no fake scarcity or
testimonials anywhere.

## Public funnel

1. `/` — landing / sales (no prices, no downstream links)
2. `/checkout` — GA only ($22); any legacy `?tier=vip` is ignored and normalized to GA
3. `/confirmed` — payment-check state; product gratitude only after a verified HttpOnly session
4. `/offer/vip-upgrade` — $77 VIP Implementation Experience (verified GA required)
5. `/offer/implementation-vault` — $199 Vault add-on (verified VIP required)
6. `/strategy-intensive` — $1,000 Intensive (verified Vault required, cap 10)
7. `/next-steps` — exact GA, VIP, Vault, or Intensive confirmation based on verified access
8. `/apply/mentorship` — $8,000 application (separate from Intensive)
9. `/next-keynote` — next-keynote priority-access / waitlist
10. `/communication-preferences` — three separate opt-in channels
11. `/privacy`, `/terms`, `/refund-policy` — pre-launch drafts (noindex)
12. `/resources` — server-validated resource hub gated by HttpOnly session

`?tier=` in the URL is display context only. It never proves purchase or
unlocks anything. Authority for entry, links, and paid resources is the
NuAmenti verification + access email plus the resulting HttpOnly session.

## Locked event flow

### Day 1 — Saturday, August 29 · 1:00–4:00 PM Eastern

- 12:45 — Room opens
- 1:00 — Welcome, goals, and build setup
- 1:20 — Niche and pressing problem
- 2:00 — Customer, offer, price, and business math
- 2:40 — Ten-minute break
- 2:50 — Business infrastructure and internal app plan
- 3:25 — AI Business GPS and Day 1 homework

### Day 2 — Sunday, August 30 · 1:00–4:00 PM Eastern

- 12:45 — Room opens
- 1:00 — Day 1 recap and system check
- 1:20 — AI agent roles, jobs, tools, and rules
- 2:00 — Workflows and improvement loops
- 2:40 — Ten-minute break
- 2:50 — Marketing, follow-up, sales, and monetization
- 3:30 — 30-day build order and Q&A

### VIP Build Lab — Thursday, September 3 · 7:00–9:00 PM Eastern

VIP buyers return after several days of implementation. The Lab focuses on
real bottlenecks, corrections, questions, and next-step builds.

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
| `VITE_KEYNOTE_DATE_ISO`                 | Next keynote date (enables the `/next-keynote` card) |
| `VITE_KEYNOTE_PRICE_LABEL`              | Optional display price for keynote            |
| `VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS`    | Comma-separated extra allowlisted hosts       |
| `VITE_SUMMIT_VIDEO_HERO`                | Landing-page VSL embed URL                    |
| `VITE_SUMMIT_VIDEO_CHECKOUT`            | GA checkout reassurance video                 |
| `VITE_SUMMIT_VIDEO_VIP_OFFER`           | VIP offer video                               |
| `VITE_SUMMIT_VIDEO_THANK_YOU_GA`        | GA confirmation video                         |
| `VITE_SUMMIT_VIDEO_THANK_YOU_VIP`       | VIP confirmation video                        |
| `VITE_SUMMIT_VIDEO_THANK_YOU_VAULT`     | Vault confirmation video                      |
| `VITE_SUMMIT_VIDEO_THANK_YOU_INTENSIVE` | Final Intensive confirmation video            |

The legacy direct-VIP browser env var and product ID are intentionally
**removed** from current activation. Anything still set in the environment
is ignored by `getCommasConfig()` and by `resolveProductFromItem()`.

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
  Raw tokens live only in the fragment and are stripped from
  `window.location` immediately after the client POSTs them to
  `/api/public/resources/exchange`.
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

- [ ] **Schedule:** all visible pages, metadata, email templates, SMS, call
      scripts, calendar files, and videos say Aug 29–30 at 1:00–4:00 PM ET;
      VIP materials say Sep 3 at 7:00–9:00 PM ET.
- [ ] **Legal:** finalize and publish counsel-approved privacy, terms, and
      refund window at `/privacy`, `/terms`, `/refund-policy`; flip
      `VITE_SUMMIT_LEGAL_READY=true`.
- [ ] **Payments:** create the four current FanBasis products, distinct IDs,
      exact success returns, inventory cap 10 on Intensive, one full signed
      webhook round-trip per product.
- [ ] **Verified access:** send and receive a real NuAmenti access email
      end-to-end for GA, VIP Upgrade, Vault, and Intensive; verify the
      magic-link (`#t=`) exchange lands a scoped HttpOnly session.
- [ ] **Communication preferences:** test opt-in, opt-out, phone-required
      logic for SMS and AI-call (with e-signature), STOP/HELP wiring, and
      that revocation writes a new row rather than deleting history.
- [ ] **Adapters:** Mailchimp audience/tags, SMS provider, AI-call provider
      credentials verified before flipping any sender ON.
- [ ] **QA scripts:** run `bun test`, `bunx tsc --noEmit`, `bun run build`,
      `psql -v ON_ERROR_STOP=1 -f scripts/verify-resource-sessions.sql`,
      and `scripts/scan-assets.sh` — all green.
- [ ] **Domain + mobile:** attach domain to this project only; test every
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
