# Commas / FanBasis Funnel Map

## Active reserve-then-settle funnel

The landing page captures the lead first. The visitor then watches one VSL per
decision page, chooses the highest level they want, and completes one Commas
checkout for the full chosen total.

| Decision       | Page             | Action                           | Total charged | Checkout environment variable                           | Success redirect                       |
| -------------- | ---------------- | -------------------------------- | ------------: | ------------------------------------------------------- | -------------------------------------- |
| Reserve GA     | `/`              | Name + email + phone; no payment |            $0 | None                                                    | `/reserve/vip?t=[reservation-token]`   |
| Keep GA        | `/reserve/vip`   | Settle General Admission         |           $22 | `VITE_COMMAS_URL_GA=[PASTE $22 COMMAS LINK]`            | `/confirmed`                           |
| Upgrade to VIP | `/reserve/vip`   | Reserve VIP; no payment yet      |            $0 | None                                                    | `/reserve/vault?t=[reservation-token]` |
| Keep VIP       | `/reserve/vault` | Settle GA + VIP bundle           |           $99 | `VITE_COMMAS_URL_GA_VIP=[PASTE $99 COMMAS LINK]`        | `/confirmed`                           |
| Add Emerald    | `/reserve/vault` | Settle GA + VIP + Emerald bundle |          $298 | `VITE_COMMAS_URL_GA_VIP_VAULT=[PASTE $298 COMMAS LINK]` | `/confirmed`                           |

Each paid Commas product needs a distinct product ID for webhook fulfillment:

- `COMMAS_PRODUCT_ID_GA`
- `COMMAS_PRODUCT_ID_GA_VIP`
- `COMMAS_PRODUCT_ID_GA_VIP_VAULT`

All three payment buttons fail closed when their matching URL is missing,
non-HTTPS, or outside the configured checkout-host allowlist.

## Email-recovery path

The existing `/offer/vip-upgrade` and `/offer/implementation-vault` pages stay
available for people who reserve but decline during the live page flow. These
use the original incremental checkout links:

| Recovery offer    | Page                          |  Price | Checkout environment variable          |
| ----------------- | ----------------------------- | -----: | -------------------------------------- |
| VIP add-on        | `/offer/vip-upgrade`          |    $77 | `VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE` |
| Vault add-on      | `/offer/implementation-vault` |   $199 | `VITE_COMMAS_CHECKOUT_URL_VAULT`       |
| Private Intensive | `/strategy-intensive`         | $1,000 | `VITE_COMMAS_CHECKOUT_URL_INTENSIVE`   |

## What each redirect page does

- `/confirmed` — final reserve-funnel confirmation for GA, VIP, or Emerald. It
  contains the confirmation VSL and no further upsell.
- `/offer/implementation-vault` — email-recovery page that confirms VIP and
  presents the $199 Vault.
- `/strategy-intensive` — email-recovery page that confirms the Vault and
  presents the $1,000 private 1-on-1.
- `/next-steps` — confirms the highest verified level the buyer owns: GA, VIP, Vault, or Intensive.

Every “No thanks” link also goes to `/next-steps`, where the buyer sees a clean confirmation for what they already purchased.

## Live Day 2 conversion timing

- Main Summit close: Sunday, August 30 at 4:00 PM Eastern.
- GA-to-VIP reset and upgrade window: 4:00–4:15 PM Eastern.
- VIP Build Lab: 4:15–5:45 PM Eastern.
- Vault offer: final part of the VIP Build Lab.
- Verified Vault buyers continue to the Intensive page immediately.

The VIP and Vault Commas links must be live, tested, and easy to paste into the room chat, email, and consented SMS before Day 2 begins.

## No-payment owner walkthrough

Start here on the Lovable private preview host:

`/?qaStage=anonymous`

Then click the main buttons normally. Preview mode advances through every step without calling Commas, charging a card, creating an order, granting an entitlement, or changing seat inventory.

## Live activation order

1. Create the $22, $99, and $298 bundle products in Commas.
2. Paste each checkout URL into its exact `VITE_COMMAS_URL_*` environment variable.
3. Add the three matching `COMMAS_PRODUCT_ID_*` values to the server environment.
4. Set `/confirmed` as the success return for all three reserve-funnel products.
5. Keep payment handoffs OFF until the signed webhook and legal review are complete.
6. Test the $22, $99, and $298 paid paths once each in Commas sandbox.
7. Test the no-payment owner walkthrough on mobile and desktop.
8. Activate the payment handoffs only after every confirmation and entitlement is correct.
