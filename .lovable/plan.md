# Where your leads and sales actually are

## What I found (verified against the live database)

**Your leads are safe — 55 of them.** The reserve form has been writing every submission to the
reservation table: first name, email and phone, all present, no blanks. They range from Jul 28
through a few minutes ago (Aug 22). Breakdown by how far each person got:

- 41 stopped at General Admission
- 11 stepped up to GA + VIP
- 4 stepped up to GA + VIP + Vault

**The Users section is empty because it is a different thing.** That panel lists *login accounts*.
This funnel has no sign-up or login anywhere, so it will always show zero. It is not where your
leads live and it never was.

**Your sales are not in the app at all.** Every purchase table is empty — zero registrations, zero
vault purchases, zero VIP upgrades, and critically **zero payment events received**. That last one
is the tell: the payment webhook has never been called, not once. So the money reached Commas, but
Commas never told this app about it. Every reservation is still marked unsettled for the same
reason, and nobody has been granted access to the paid resources.

## The plan

### 1. Reconnect sales (the urgent one)
Confirm the webhook endpoint, signing secret and product IDs are configured on both this app and
the Commas side, then verify end to end that a real event arrives, gets recorded, and settles the
matching reservation. Until this works, no purchase will ever appear here and no buyer gets access.
Also add a backfill path so the sales you already made can be entered and fulfilled properly
rather than being lost.

### 2. A leads screen you can actually use
Add a reservations view to the existing owner-protected admin area: name, email, phone, how far they
got, settled or not, and date — searchable, sortable, with one-click CSV export. Same owner-email
gate as the audit dashboard; nothing about it is public.

### 3. Stop losing the list to a single database
- Send a confirmation email to each new reservation from your verified sender, so the person has
  something in their inbox and you have a delivery record.
- Push each reservation into Mailchimp with a tag reflecting the tier they reserved, so the list
  lives somewhere you can market from. Off until the audience and credentials are in place.
- Backfill all 55 existing reservations into Mailchimp once it is connected.

### 4. Tests
Cover: a reservation still saves if the email or Mailchimp call fails; the admin list rejects
non-owners; the webhook records an event and settles the right reservation; the backfill is
idempotent.

## Technical notes

- Reservation table already stores everything needed; step 3 adds a nullable `synced_at` column so
  the Mailchimp backfill can run repeatedly without duplicating.
- Email and Mailchimp calls happen after the insert succeeds and are wrapped so failure never
  breaks a reservation.
- Admin list follows the existing `/api/public/admin/summit-audit` + `/admin/audit` pattern:
  service-role read only, no browser access to the table.
- Webhook diagnosis starts from the empty payment-events table — that rules out signature rejection
  after receipt and points at endpoint URL or event subscription on the provider side.

## Input needed from you

- The webhook URL and signing secret currently configured in Commas, plus the product IDs.
- Order details for the sales already made, so they can be backfilled.
- Mailchimp API key and audience ID.
