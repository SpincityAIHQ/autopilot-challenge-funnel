# Open the Summit free for 7 days, remove all payment buttons

Nobody is charged anywhere on the site. Everyone who signs in gets the full
Summit experience free for 7 days. Instead of buying, people can text you to
donate, ask about the Accelerator or a consultation, or join the Skool
community.

## What visitors will see

- **No prices, no buy buttons, no checkout anywhere.** Every "Get instant
  access", "Reserve my seat", "$22 / $99 / $298 / $4,000" button and price tag
  on the Summit, Vault, reserve and offer pages is replaced.
- **One clear free-week banner** on Summit, Vault, My Learning and the class
  pages: the full Summit library is open to everyone who signs in, free, for 7
  days. Sign in or create a free account and start watching.
- **A single "what's next" panel** replacing the old ticket cards:
  - Enjoyed it? Text **510-747-5291** to donate.
  - Interested in the Accelerator or a 1-on-1 consultation? Text the same
    number with what you're after.
  - Join the community: https://www.skool.com/the-ascended-masters/about
- **Accelerator stays invite-based** — its page keeps the lessons for current
  students and points everyone else to the text line instead of a price.

## How the free week works

- On the server, any signed-in learner with a confirmed email is treated as
  holding the full Summit level (GA + VIP + Emerald Vault) while the open week
  is running. Accelerator content is NOT included.
- The window has an explicit end date stored as a server setting. When it
  passes, access quietly reverts to real entitlements — no code change needed
  to close it.
- Existing grants (the Q4 cohort, imported buyers, owner grants, Accelerator
  students) are untouched and keep working before, during and after the week.
- Nothing is sent to learners automatically; no emails, no messages.

## Technical detail

1. `src/lib/academy-access.server.ts` — in `redeemedGrants`, after the
   imported-ticket lookup, union in `["ga","vip","vault"]` when an open-access
   window is active. New small helper `openAccessActive()` reading
   `ACADEMY_OPEN_ACCESS_UNTIL` (ISO timestamp; absent/expired = off). Never adds
   `accelerator`. Paid guards, code redemption and reconciliation untouched.
2. `.env` / `.env.example` — add `ACADEMY_OPEN_ACCESS_UNTIL` set 7 days out, with
   a comment that clearing it ends the free week.
3. `src/lib/academy.ts` — replace `SUMMIT_OFFERS` / `ACCELERATOR_OFFER` checkout
   URLs and prices with a single exported `SUPPORT_OPTIONS` (donate-by-text,
   Accelerator/consult-by-text, Skool link) plus `OPEN_ACCESS_NOTICE` copy.
   `nextOffer()` returns the support panel instead of a paid upsell.
4. `src/routes/summit.tsx`, `src/routes/vault.tsx`, `src/routes/learn.tsx`,
   `src/routes/accelerator.tsx`, `src/routes/class.tsx` — swap ticket cards and
   locked-state copy for the free-week banner and support panel; locked lesson
   states become "open this week — sign in".
5. `src/routes/checkout.tsx`, `src/routes/reserve/*`, `src/routes/offer/*` —
   remove payment CTAs; render the free-week/support panel instead. Routes stay
   alive so old links don't 404.
6. `src/routes/api/public/checkout/$tier.ts` — stop redirecting to any store;
   respond with a permanent redirect to `/summit`. `academy-checkout.server.ts`
   returns null for every tier (payments off).
7. `src/components/reserve/LandingReservationForm.tsx` and homepage copy — keep
   lead capture, drop purchase language.
8. Tests: update `src/tests/checkout-config.test.ts`,
   `branding-checkout-flow.test.ts`, `reserve-funnel.test.ts`,
   `entitlement-model.test.ts`, `tiers.test.ts` for the no-payment state; add
   coverage that the open window grants Summit tiers but never Accelerator, and
   that an expired window grants nothing extra.
9. No schema changes, no migrations, no sends, no secret changes. Payments stay
   disabled; Shopify/Stripe/GHL config is left alone so it can be restored later.

## Not included

- No donation processing in the app (text only, per your instruction).
- No changes to Accelerator entitlements or existing student access.
- Publishing is a separate step after you review the preview.
