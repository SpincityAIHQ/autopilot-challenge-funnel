# Skool membership becomes the way in

Money moves to Skool. The app stops being something people buy and becomes what a paying Skool member gets.

- Free Skool tier: the free training only (what's already public on the site).
- $97/month: full Summit app access — Day 1, Day 2, both VIP rooms, Emerald day and the Vault.
- $555/month: everything above plus the Accelerator classroom.

No prices or buy buttons return to the site; the site explains the tiers and sends people to Skool to join.

## How a member gets in

When someone joins or upgrades a paid tier in Skool, Skool (through its Zapier connection — Skool has no direct webhook of its own) sends their email and tier to a private address in your app. The app then unlocks the matching access for that email. When they sign in with that same email, everything is simply there.

If their membership ends or they downgrade, the same connection removes the access again, so the app always matches Skool.

Two safety nets:
- A member can text you and you grant them by hand from the owner page — same result, no waiting.
- If the email they use in Skool differs from the one they sign in with, the access sits waiting until they sign in with the Skool email; they text you and you fix it in one step.

Once the code is in, I'll give you the exact address and secret to paste into Zapier, plus the step-by-step to set the two tiers up inside Skool.

## What changes on the site

- Summit, Vault, VIP upgrade, Strategy Intensive pages: "Included with the $97/month membership" and a single Join on Skool button.
- Accelerator page: "Included with the $555/month membership" — replaces the invite-only wording. Your current students keep their access exactly as it is.
- Free training pages stay free and point to the free Skool tier as the next step.
- The text-me line stays for questions and 1-on-1 interest; donation wording is retired since there's now a way to pay.
- Thoth learns the new tiers and stops saying nothing is for sale.

## The free week

It ends when the new tiers go live rather than running to 23 Sep, since the $97 tier replaces it. Anyone who signed in during the week keeps whatever they already unlocked; they just need the membership for anything new.

## Technical notes

- New `src/routes/api/public/webhooks/skool.ts` + `src/lib/academy-skool.server.ts`: shared-secret header check (`SKOOL_WEBHOOK_SECRET`), Zod-validated payload (email, tier/plan, event: joined / upgraded / downgraded / cancelled), idempotent by event id, fail-closed on bad secret.
- Membership grants are written as owner-grant imported tickets (`academy-imported-tickets.server.ts`) with source `skool-membership`, tier map: `97 → ga, vip, vault`; `555 → ga, vip, vault, accelerator`. Cancel/downgrade expires the membership rows only — never touches `q4-cohort-2026-09-14` or any purchased/imported grant.
- `OPEN_ACCESS_UNTIL` cleared so `withOpenAccess()` is inert; open-access code path left in place for reuse.
- Offer copy in `src/lib/academy.ts` (`OPEN_ACCESS_NOTICE`, `nextOffer()`), plus `summit.tsx`, `vault.tsx`, `accelerator.tsx`, `offer/vip-upgrade.tsx`, `offer/implementation-vault.tsx`, `strategy-intensive.tsx`, `checkout.tsx`. Prices stay 0 and `PAYMENTS_ENABLED` stays false — no checkout returns.
- Owner manual grant/revoke by email added to the existing admin area.
- Tests: webhook auth, tier mapping, idempotency, cancellation scope, no-price assertions updated to the membership wording.
- Preview only; secret added when you approve. Nothing published until you say so.

## Needs from you

The Skool join link for each tier once they exist — until then buttons point at your Skool about page.
