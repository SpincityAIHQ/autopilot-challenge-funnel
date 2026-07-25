# Resource Delivery

## Entitlement model (product rule — NOT a tier ordering)

- **GA scope** grants GA resources only.
- **VIP scope** (also `vip_upgrade`) grants VIP resources AND the GA
  resources included in VIP admission.
- **Vault scope** grants Vault resources only. It is INDEPENDENT — it
  never inherits GA or VIP.
- A buyer may hold multiple scopes at once; access is the union.

There is no `ga < vip < vault` comparison anywhere in code or docs.

## Tier manifest

| Slug | Tier | Name |
|---|---|---|
| action-guide | ga | Summit Action Guide |
| ai-readiness-scorecard | ga | AI Readiness Scorecard |
| buyer-offer-canvas | ga | Buyer + Offer Canvas |
| vip-proposal-kit | vip | VIP Proposal + Outreach Kit |
| company-brain | vault | Company Brain Starter Kit |
| prompt-stack | vault | AI Sales + Follow-up Prompt Stack |
| site-blueprint | vault | Lovable Funnel + Site Blueprint |
| campaign-calendar | vault | 30-Day Campaign Calendar |
| proposal-builder | vault | Corporate Proposal Builder |
| autonomy-map | vault | Autonomy Map + SOP Templates |
| affiliate-directory | vault | Verified Tool Stack + Affiliate Directory |

## Content isolation

- **Public metadata** (`slug`, `tier`, `name`, `preview`) lives in
  `src/lib/resource-metadata.ts` — safe for the client bundle.
- **Paid section content** lives ONLY in `src/lib/resource-content.server.ts`.
  This module is imported by server routes only. A source-scan test in
  `src/tests/canonical-routes.test.ts` fails if any non-server file
  imports it, and scans for unique paid-content phrases so leakage
  regresses the test suite.

## Access lifecycle

1. **Issued.** After a verified `payment.succeeded` webhook fulfills an
   entitlement, an operator (or the delivery worker, once wired) mints a
   raw magic token with `generateAccessToken()` and stores
   `hashToken(raw)` in `public.access_tokens` alongside `buyer_email`,
   `scope`, and `expires_at`. The raw token is NEVER stored server-side.
2. **Delivered.** Mailchimp (planned) sends the magic link
   `https://…/resources/{slug}#t={raw}`. The raw token lives ONLY in the
   URL fragment and is therefore never transmitted to the server by the
   browser.
3. **Exchanged (single use).** The client reads the fragment, POSTs
   `{token}` to `/api/public/resources/exchange`, then calls
   `history.replaceState` to strip `#t=…` from `window.location`
   immediately. The exchange route calls the atomic service-role-only
   RPC `exchange_access_token`, which:
   - marks `access_tokens.used_at = now()` exactly once, requiring
     `used_at IS NULL`, `revoked_at IS NULL`, and `expires_at > now()`;
   - verifies an active entitlement for the token's scope;
   - inserts a `resource_sessions` row storing ONLY the SHA-256 hash of a
     newly minted random session token, the buyer email, source-token
     hash, expiry, and an `issued_scopes` audit column.
   The raw session token is returned exclusively as
   `Set-Cookie: summit_rs=…; HttpOnly; Secure; SameSite=Lax; Max-Age=…`.
   The JSON body contains only `{ok, expiresAt}`. No response ever
   contains the raw magic token.
4. **Read.** `/api/public/resources/read` accepts only `{slug}`, reads
   the session cookie, calls `session_active_scopes` (which re-checks
   CURRENT active entitlements on every read — refunds/revocations block
   immediately), and returns the full sections only when a matching
   active scope is present. All responses use
   `Cache-Control: private, no-store`.
5. **Revoked.** On `payment.refunded` / `payment.failed` /
   `payment.disputed`, `reverse_summit_payment` revokes only the
   entitlements attached to the refunded product (Vault refund never
   touches admission; VIP-upgrade refund preserves GA; intensive refund
   releases the slot). A future read using the same session cookie sees
   no active entitlement and returns 401/403.

## Explicit revocation

An operator can revoke a magic token before it is used:

```sql
UPDATE public.access_tokens SET revoked_at = now()
 WHERE token_hash = '<sha256-hex>';
```

The next attempted exchange fails with `token not exchangeable` (401).

## Failure modes

| Status | Meaning |
|---|---|
| 200 | Cookie set (exchange) or sections returned (read). |
| 400 | Body malformed or oversize (>4KB). |
| 401 | Token unknown/expired/revoked/already-used, or session cookie missing/expired. |
| 403 | Session lacks a scope that grants this resource tier. |
| 404 | Unknown resource slug. |
| 500 | Server error. |

## What the client cannot do

- Cannot read raw session tokens — the cookie is HttpOnly.
- Cannot pass the magic token to `/read` — `/read` accepts only `{slug}`.
- Cannot re-use a magic link — the second exchange fails atomically.
- Cannot bypass revocation — every `/read` re-checks entitlements.
