# A place to see and follow up with your leads

## The situation

You have 55 people who left their information on the reserve form, dating from Jul 28 through
tonight. Every one of them has a first name, an email and a phone number. Nothing is lost.

They don't show in the Users panel because that panel lists login accounts, and this funnel has no
sign-up or login — it will always read zero there. There is simply no screen in the app that shows
the reservation list, so the only way to see it right now is a direct database query.

## What to build

**A leads page at `/admin/leads`**, behind the same owner-email protection the audit dashboard
already uses.

It shows one row per person:

- First name
- Email (click to compose)
- Phone (click to call or text)
- How far they got: General Admission, GA + VIP, or GA + VIP + Vault
- When they reserved

Plus:

- Search by name, email or phone
- Filter by tier
- Sort by newest or oldest
- **Download CSV** — the whole list, or whatever the current filter shows, so you can drop it
  straight into your email tool or phone dialer

Duplicates (the same email reserving twice as they moved up a tier) are collapsed to one row per
person showing their highest tier, with the earliest contact date.

## Technical notes

- Follows the existing `/api/public/admin/summit-audit` + `/admin/audit` pattern exactly: a
  service-role read on the server, owner-email gate, no browser access to the table, no new grants.
- Read-only — no schema change and no writes to the reservations table.
- CSV is generated server-side from the same filtered query the page displays.
