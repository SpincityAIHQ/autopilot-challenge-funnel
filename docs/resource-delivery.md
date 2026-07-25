# Resource Delivery

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

Tier order (ascending capability): `ga` < `vip` < `vault`.
An access token whose scope is `vault` reads any resource. A token whose
scope is `ga` only reads GA resources. A `vip_upgrade`-scoped token is
normalized to `vip`.

## Access token lifecycle

1. **Issued.** After a fulfilled `payment.succeeded` webhook, an operator
   (or the delivery worker, once wired) generates a token with
   `generateAccessToken()` and stores `hashToken(raw)` in
   `public.access_tokens` alongside `buyer_email`, `scope`, and
   `expires_at`. Tokens expire on a configured window (default 30 days for
   VIP recordings; longer for Vault at operator's discretion).
2. **Delivered.** The magic link `https://…/resources/{slug}?t={raw}` is
   sent via Mailchimp (planned). The raw token is NEVER stored server-side.
3. **Consumed.** When the buyer opens the link, the client `POST`s
   `{slug, token}` to `/api/public/resources/read`. The server hashes
   the token, calls `entitlement_by_token_hash`, and returns the full
   resource sections only when active + scope covers the requested tier.
4. **Reversed.** On `payment.refunded` / `payment.failed` /
   `payment.disputed`, `reverse_summit_payment` invalidates the
   entitlement; subsequent reads return 401.

## What the client can and cannot read

- The client can read the resource **metadata** (`slug`, `tier`, `name`,
  `preview`) — this ships in the bundle at `src/lib/resource-content.ts`
  through `listResourceMetas()`.
- The client CANNOT read the resource **sections** without a valid token.
  Section content lives in the same module but is only returned by the
  server-side `/api/public/resources/read` endpoint after token
  verification.

## Failure modes (return codes)

| Status | Meaning |
|---|---|
| 200 | Token valid; returning `{slug, tier, name, sections}`. |
| 400 | Body malformed / oversize (>4KB). |
| 401 | Token unknown, expired, revoked, or already used. |
| 403 | Token scope does not cover requested resource tier. |
| 404 | Unknown resource slug. |
| 500 | Server error. |

## Operator quick actions

Issue a token (manual, until worker is wired):

```sql
insert into public.access_tokens (token_hash, buyer_email, scope, expires_at)
values ('<sha256-hex>', 'buyer@example.com', 'vault', now() + interval '30 days');
```

Revoke a token:

```sql
update public.access_tokens
set revoked_at = now()
where token_hash = '<sha256-hex>';
```
