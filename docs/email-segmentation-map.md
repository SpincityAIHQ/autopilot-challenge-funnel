# AI AutoPilot Summit — Email Segmentation Map

## Source of truth

The verified Commas `payment.succeeded` webhook and active Supabase
entitlements determine what a buyer owns. A URL visit, button click, query
string, or self-reported ticket never changes a buyer's email level.

The code map lives in `src/lib/summit-email-segmentation.ts`.

## Mailchimp audience structure

Use one primary Mailchimp audience. Create one hidden audience field:

- Field name: `Summit Level`
- Merge tag: `SUMMITLVL`
- Allowed working values: `GA`, `VIP`, `VAULT`, `INTENSIVE`

Create these exact tags:

- `AAS26 · BUYER`
- `AAS26 · PURCHASED · GA`
- `AAS26 · PURCHASED · VIP`
- `AAS26 · PURCHASED · VAULT`
- `AAS26 · PURCHASED · INTENSIVE`
- `AAS26 · CURRENT · GA`
- `AAS26 · CURRENT · VIP`
- `AAS26 · CURRENT · VAULT`
- `AAS26 · CURRENT · INTENSIVE`

Purchase-history tags stay active. Only one `CURRENT` tag stays active.

## Verified purchase mapping

| Verified product | SUMMITLVL | Active purchase tags | Active current tag |
|---|---|---|---|
| General Admission | `GA` | BUYER + GA | CURRENT · GA |
| VIP upgrade | `VIP` | BUYER + GA + VIP | CURRENT · VIP |
| Implementation Vault | `VAULT` | BUYER + GA + VIP + VAULT | CURRENT · VAULT |
| Strategy & Build Intensive | `INTENSIVE` | BUYER + GA + VIP + VAULT + INTENSIVE | CURRENT · INTENSIVE |

Every upgrade removes the older `CURRENT` tag and replaces it with the new
highest level. It does not remove historical purchase tags.

## Journey rules

### GA journey

Trigger: `AAS26 · CURRENT · GA`

Send:

- General Admission confirmation
- Calendar and access instructions
- Day 1 preparation
- Day 2 preparation
- Optional VIP explanation

Stop when `CURRENT · GA` is removed.

### VIP journey

Trigger: `AAS26 · CURRENT · VIP`

Send:

- VIP confirmation
- Recordings and Build Lab instructions
- Priority-question intake
- VIP preparation sequence
- Optional Vault explanation

Never send another VIP sales email.

### Vault journey

Trigger: `AAS26 · CURRENT · VAULT`

Send:

- Vault confirmation
- Secure Vault-access instructions
- Resource orientation
- Implementation checklist
- Optional private Intensive explanation

Never send another VIP or Vault sales email.

### Intensive journey

Trigger: `AAS26 · CURRENT · INTENSIVE`

Send:

- Full-purchase confirmation
- Scheduling instructions
- Private-session preparation form
- Summit reminders matched to the full purchase

Do not send any remaining funnel sales emails.

## Transactional versus marketing communication

Purchase confirmations, access delivery, scheduling, refunds, and essential
event changes are transactional. Marketing nurture, optional-upgrade pitches,
AI calls, and promotional texts follow the buyer's recorded channel consent.

Mailchimp marketing tags must not override an unsubscribe or missing marketing
consent. Supabase remains the source of truth for purchases even when a buyer
is not eligible for marketing email.

## Build order in Mailchimp

1. Create the audience field and all tags.
2. Build the four Customer Journeys and their exit rules.
3. Test each journey with internal email addresses.
4. Connect the verified webhook-to-Mailchimp sync.
5. Backfill existing buyers only after the journeys are active and reviewed.
6. Confirm that upgrading removes the prior `CURRENT` tag immediately.
7. Confirm that a refund or dispute recalculates the highest active level.

## Operator QA cases

- GA buyer declines VIP → GA confirmation + GA email journey.
- VIP buyer declines Vault → VIP confirmation + VIP email journey.
- Vault buyer declines Intensive → Vault confirmation + Vault email journey.
- Intensive buyer completes the funnel → Intensive confirmation + scheduling journey.
- Buyer upgrades later → prior sales journey stops; new journey begins.
- Buyer unsubscribes → purchase record remains, marketing stops.
- Refunded product → related access is revoked and email level is recalculated.
