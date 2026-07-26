# AI AutoPilot Summit — Current Sequential Funnel

Live status of this project (`autopilot-challenge-funnel.lovable.app`). No
deploy. Every external integration ships fail-closed; query strings never
grant access.

## Event

- Day 1: **Saturday, August 29, 2026 · 1:00–4:00 PM Eastern**.
- Day 2: **Sunday, August 30, 2026 · 1:00–4:00 PM Eastern**.
- The live room opens at **12:45 PM Eastern** both days.
- VIP Build Lab: **Sunday, August 30, 2026 · 4:15–5:45 PM Eastern**, immediately after Day 2.
- The 15-minute gap from 4:00–4:15 PM is the reset and live upgrade window.
- The Summit schedule takes priority over normal recurring work blocks.

## Live conversion sequence

1. Day 2 closes at 4:00 PM Eastern.
2. General Admission buyers receive the live VIP invitation and direct $77 checkout link before leaving the room.
3. The VIP Build Lab begins at 4:15 PM Eastern while the material and urgency are still fresh.
4. The Vault is presented during the final part of the VIP Lab.
5. A Vault buyer is redirected to the private Strategy & Build Intensive page.
6. Every buyer who declines an offer still reaches the correct confirmation and next-steps page for what they own.

## Sale products (four, sequential — no bundles, no tier picker)

| # | Product                              | Price   | Where sold |
|---|--------------------------------------|---------|------------|
| 1 | General Admission (GA)               | $22     | `/checkout` (only public sale) |
| 2 | VIP Implementation Experience        | $77     | `/offer/vip-upgrade` (verified GA required) |
| 3 | AI AutoPilot Implementation Vault    | $199    | `/offer/implementation-vault` (verified VIP required) |
| 4 | Strategy & Build Intensive           | $1,000  | `/strategy-intensive` (verified Vault required; **cap 10**, atomic) |

Separate gated path (not part of the four-product ascension):

- **Eight-Week Mentorship & Work-Along** — $8,000, application-only at
  `/apply/mentorship`, gated by `VITE_SUMMIT_MENTORSHIP_APPLICATIONS_ENABLED`.
  Not capped at 10.

Direct-VIP admission is **not** sold. Legacy Founder, Bundle, GA/VIP
public tier picker, price-difference VIP upgrade math, raw query-token
magic links, placeholder videos, and stale event dates are removed
from the current funnel. Historical DB migrations remain in place as
immutable audit history only.

## Verified-session offer visibility

- `/confirmed`, `/offer/vip-upgrade`, `/offer/implementation-vault`,
  `/strategy-intensive`, `/apply/mentorship`, and `/next-steps` render
  neutral, product-agnostic copy for anonymous visitors and crawlers.
- Head metadata for each of the above is generic ("Next step — AI
  AutoPilot Summit") with `noindex`. Product names, prices, and the next
  offer never leak from static SEO or from `?tier=`.
- `useEntitlementSummary()` calls the session-scoped
  `/api/public/entitlement-summary` endpoint. The rich product-specific
  thank-you card and next-offer CTAs only render after the server confirms
  the required prior scope.

## Magic-link and session flow

1. Fulfillment (`fulfill_summit_payment`) mints an `access_tokens` row
   keyed by `sha256(raw)`, `buyer_email`, `scope`, and `expires_at`.
2. Delivery emails the link `https://<domain>/resources/<slug>#t=<raw>`.
   The raw token lives only in the URL fragment and is never sent to the
   server automatically.
3. The client POSTs the token to `/api/public/resources/exchange`, which
   atomically consumes it and drops an HttpOnly `summit_rs` cookie. The
   client immediately calls `history.replaceState` to strip the fragment.
4. `/api/public/resources/read` accepts `{slug}` only, re-checks active
   scopes via `session_active_scopes`, and returns `Cache-Control:
   private, no-store`.

## Consent and legal

- `/communication-preferences` derives identity from the HttpOnly session
  and requires an e-signature for AI-call opt-in.
- Consent copy version: `2026-07-25-v1`. All channels unbundled, unchecked
  by default, revocable.
- Checkout stays disabled until `VITE_SUMMIT_LEGAL_READY=true` and the
  counsel-approved Privacy, Terms, and Refund Policy are posted.

## Adapters (OFF at rest)

- Mailchimp, SMS (Twilio-compatible), AI/prerecorded calls: interfaces
  defined and gated. Nothing sends until credentials, verified sender,
  audience/tags, and templates are configured.
- Signed-return bridge (redirect state signing) is **BLOCKED** pending
  FanBasis confirming the exact metadata / custom-field name used for
  first- and last-touch attribution. Until unblocked the server persists
  `null` for attribution.

## Least-privilege access

- All PII, entitlement, delivery, consent, and rate-limit tables have RLS
  enabled and no privileges granted to `anon`, `authenticated`, or the
  bundled sandbox role. Only `service_role` holds narrow DML on required
  tables. Fulfillment/reversal RPCs are `SECURITY DEFINER` and
  `EXECUTE`-only to `service_role`.

## QA gates

- `bun test` — sequential-funnel, checkout-config, webhook, entitlement,
  product-thank-you, rate-limit, and canonical-route source-scan suites.
- `bunx tsc --noEmit`.
- `bun run build`.
- `scripts/scan-assets.sh` — asserts client bundle carries no paid-body
  phrases and repo carries no legacy pricing/date/product tokens.
- `psql -v ON_ERROR_STOP=1 -f scripts/verify-resource-sessions.sql` —
  exercises fulfillment, refund reversal (by `source_payment_id`), and
  session lifecycle in a transaction that rolls back.
- `bun run release:check` runs all of the above.
