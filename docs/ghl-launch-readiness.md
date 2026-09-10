# GHL / SPINXP launch evidence — 2026-09-10

New sales are prepared for Stripe inside GHL. SPINXP remains the authority for verified ticket access, learning activity, follow-up timing and consent. Existing Shopify/imported buyers retain their current verification paths. This record distinguishes prepared code from live customer proof.

## Completed

- Four one-time USD products and hosted payment links created in the Nuamenti.com GHL location and verified after reload. Each has fixed quantity one and returns to `/redeem`.
- Native branded Auth email handler published; signed requests required. Confirm email enabled. One owner magic-link request accepted and recorded as **sent** by the verified managed sender on 2026-09-10. Inbox arrival and verification-click completion remain unconfirmed.
- GHL payments are read back from the provider before access is granted; browser redirects and contact tags cannot prove payment. The payment adapter passed 44 unit/HTTP checks, 12 actual PostgreSQL customer-flow checks and 33 historical-access regression checks.
- Direct GHL messaging preserves individual email/SMS jobs, current contact identity and DND, consent, late learning/purchase checks, and sanitized provider acceptance IDs. The merged workers passed 63 scenarios; the helper passed 23 HTTP cases. Five receipt-schema checks passed.
- The brief-view gap is closed: 1–59 seconds watched now qualifies for an accurate recovery message after 48 hours without recorded activity. Zero/seek-only viewing is not classified as a brief start. Twenty-four boundary/SQL checks passed.
- All optional reminders, including a never-started webinar reminder, share the daily cap and in-flight limit. Transactional welcomes and purchase confirmations remain independent.
- Four active transcript-evidenced **break** markers exist for the current Day 1/Day 2 Vimeo versions. No lunch event is inferred. Copy describes a pause near a break.
- Additive provider-receipt columns and the shared optional claim RPC were applied before app deployment. Deploy the app before the updated learning queue RPC.
- Access-code secret created privately. Existing secrets were preserved.

## Customer scenarios

| Scenario | Expected behavior | Evidence |
| --- | --- | --- |
| New registration | One welcome plus primer; optional SMS only with consent and a configured number | Mocked transport/worker checks; GHL live send pending |
| Existing customer returns | Correct contact updated without duplicate welcome or resetting paid access | Mocked worker checks |
| Paid GA customer | Verified GHL payment, same verified inbox, explicit activation, one confirmation | PostgreSQL/HTTP checks; real payment pending |
| Leaves during the first recording hour or near a verified break | Appropriate 48-hour recovery; cancelled after return/progress/opt-out | SQL and merged worker checks |
| Provider timeout or concurrent email/SMS | Keep separate channel outcomes; do not blindly retry an uncertain send | Merged worker checks |

## Blocking live setup

1. Complete Stripe owner authorization inside GHL, then verify the connected `acct_...` and live/test transaction shapes.
2. Create the scoped GHL Private Integration and save its token in private server Secrets. The creation screen is available; no token has been issued. Required scopes: `contacts.readonly`, `contacts.write`, `conversations/message.write`, `payments/orders.readonly`, `payments/transactions.readonly`. Add `conversations/message.readonly` for operational delivery inspection.
3. Configure the verified email sender and provision the SMS number before enabling that channel. No live GHL welcome, purchase confirmation or SMS has been proven. Native Auth email is a separate path.
4. Store one shared payment-workflow bearer secret privately in GHL and the app; configure the Payment Received handoff described in `ghl-payments.md`. No payment workflow or shared bearer secret is live yet.
5. Confirm approved per-tier app access terms and the exact Accelerator programme end timestamp/timezone. Earlier product wording establishes GA replay access of 48 hours and VIP recordings for 30 days, but does not by itself settle all app-resource expiry. Do not invent Emerald or Accelerator terms.
6. Complete owner email click-through, then a fresh-account welcome and an authorized real $22 GA purchase/activation/refund loop. Only then enable GHL checkout and paid/email-ticket flags.

GHL checkout stays disabled pending these checks. Selecting direct API transport with missing credentials holds dispatch and never falls back to the old workflow. The old workflow remains a draft; retire its exposed inbound trigger after the new private connection is verified. No list blast or live charge was performed.

Lovable Secrets browser access currently requires owner sign-in: Google rejected the prior credential and reported it had changed. The connected Lovable tools were still able to publish code, configure native Auth, and prepare the private access-code secret.

## Catalog prepared in GHL

| Tier | USD | Product | Price | Hosted checkout |
| --- | ---: | --- | --- | --- |
| GA | 22 | `6aa1f6dd18a496fa6bc46ce6` | `6aa1f6dd18a496fa6bc46cfe` | [GA](https://link.fastpaydirect.com/payment-link/6aa1f867ceb12d9fc1a8c0f1) |
| VIP | 99 | `6aa1f7493b0b7d7ff0d19f36` | `6aa1f7493b0b7d7ff0d19f3e` | [VIP](https://link.fastpaydirect.com/payment-link/6aa1f90bceb12d9fc1a8c0f4) |
| Vault | 298 | `6aa1f7987e2abb362cdd45a7` | `6aa1f7987e2abb362cdd45af` | [Vault](https://link.fastpaydirect.com/payment-link/6aa1f96aceb12d9fc1a8c0f8) |
| Accelerator | 4000 | `6aa1f7e1d9bc1181f0742018` | `6aa1f7e1d9bc1181f0742020` | [Accelerator](https://link.fastpaydirect.com/payment-link/6aa1f9cdceb12d9fc1a8c0f9) |

Links are configured for live checkout but were not payable while Stripe was disconnected. Catalog creation is not proof of a successful charge.
