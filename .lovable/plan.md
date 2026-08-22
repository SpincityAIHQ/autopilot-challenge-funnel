# Reservation emails: what's stored today, and what's missing

## Current state (verified)

Reservations **are** being captured. The `summit_reservations` table holds 55 rows, every one of
them with a first name, email and phone; the most recent came in on Aug 21. The reserve form posts
to the server, which writes the row and returns the private token used for the VIP/Vault steps.

What is missing is anything *downstream* of that row:

- No confirmation email is ever sent to the person who reserves.
- Nothing pushes the address into Mailchimp (the adapter exists but is never called from the
  reserve path).
- There is no operator-facing place to see or export the list — the table is service-role only, so
  it can only be read through a query.

So the addresses are safe, but today they just sit in the database.

## Proposed work

1. **Reservation confirmation email**
   Send a branded "Your seat is reserved" email immediately after a reservation is created, using
   the already-configured sender domain. Content: first name, Summit dates, what happens next, and
   a link back to their reservation step. Sending failures must never break the reservation — the
   row is written first, the email is best-effort.

2. **Mailchimp sync (optional, off until configured)**
   On successful reservation, add/update the contact in the configured audience with a
   `reserved` tag and merge fields for first name and reserved tier. Fails closed and silently when
   audience/API credentials are absent.

3. **Operator visibility**
   Add a reservations view to the existing admin surface (same owner-email gate as the audit
   dashboard) listing name, email, phone, reserved tier, settled state and date, with CSV export.

4. **Tests**
   Cover: reservation still succeeds when the email send throws; email is addressed to the
   submitted address; Mailchimp adapter is a no-op without config; admin route rejects non-owners.

## Technical notes

- Email send happens inside the existing `/api/public/reserve` handler after the insert succeeds,
  wrapped so any error is logged and swallowed.
- New template registered in the existing template registry so it shows in the email preview surface.
- Admin listing follows the pattern of `/api/public/admin/summit-audit` + `/admin/audit`; no new
  grants, service-role read only, no browser access to the table.
- No schema change is required for steps 1 and 3; step 2 adds a nullable `synced_at` column so
  repeat syncs are idempotent.

## Open input needed

Mailchimp audience/tag IDs and API credentials before step 2 can actually send anything.
