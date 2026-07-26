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

## Locked event timing

- Day 1: Saturday, August 29, 2026 · 1:00–4:00 PM Eastern
- Day 2: Sunday, August 30, 2026 · 1:00–4:00 PM Eastern
- VIP Build Lab: Sunday, August 30 · 4:15–5:45 PM Eastern, immediately after Day 2
- GA-to-VIP live upgrade window: Sunday, August 30 · 3:45–4:15 PM Eastern

## Journey rules

### GA journey

Trigger: `AAS26 · CURRENT · GA`

Send:

- General Admission confirmation
- Calendar and access instructions
- Day 1 preparation
- Day 2 preparation
- Optional VIP explanation
- Live GA-only VIP invitation at the Day 2 close

The final live VIP invitation goes out before the 4:15 PM Lab begins. Do not
continue sending VIP sales messages after the live upgrade window closes.

Stop immediately when `CURRENT · GA` is removed.

### VIP journey

Trigger: `AAS26 · CURRENT · VIP`

Send:

- VIP confirmation
- Recording expectations
- Priority-question intake
- Immediate Build Lab access for Sunday, August 30 at 4:15 PM Eastern
- Optional Vault explanation during the final part of the Build Lab

Never send another VIP sales email. When the VIP tag is applied during the
live close, the buyer should receive the Lab-access message immediately.

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
8. Test the Day 2 live close: GA → VIP tag → immediate Lab-access email.
9. Test the VIP Lab close: VIP → Vault tag → Vault access + Intensive page.

## Operator QA cases

- GA buyer declines VIP → GA confirmation + GA email journey.
- GA buyer upgrades live → VIP tag replaces current GA and delivers the Lab link before 4:15 PM.
- VIP buyer declines Vault → VIP confirmation + VIP email journey.
- Vault buyer declines Intensive → Vault confirmation + Vault email journey.
- Intensive buyer completes the funnel → Intensive confirmation + scheduling journey.
- Buyer upgrades later → prior sales journey stops; new journey begins.
- Buyer unsubscribes → purchase record remains, marketing stops.
- Refunded product → related access is revoked and email level is recalculated.
