# Commas / FanBasis Funnel Map

Use one separate Commas product and checkout link for each paid step.

| Step | Offer page | Price | Normal checkout fallback | Success page |
|---|---|---:|---|---|
| 1 | `/checkout` | $22 | `VITE_COMMAS_CHECKOUT_URL_GA` | `/confirmed` |
| 2 | `/offer/vip-upgrade` | $77 | `VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE` | `/offer/implementation-vault` |
| 3 | `/offer/implementation-vault` | $199 | `VITE_COMMAS_CHECKOUT_URL_VAULT` | `/strategy-intensive` |
| 4 | `/strategy-intensive` | $1,000 | `VITE_COMMAS_CHECKOUT_URL_INTENSIVE` | `/next-steps` |

## Payment behavior by step

### General Admission — $22

The buyer completes a normal secure Commas checkout and enters their contact
and payment information.

### VIP — $77

After verified GA access, the funnel checks Commas for an eligible saved card.

- Saved card available: one explicit click charges the displayed card and exact
  $77 amount.
- Saved card unavailable or API unavailable: normal Commas checkout link.

### Vault — $199

After verified VIP access, the same saved-card logic applies for the exact $199
one-time amount, with the normal Commas checkout as fallback.

### Intensive — $1,000

Always uses the full Commas checkout. There is no one-click charge for the
Intensive because the offer has real hard-cap seat inventory and materially
higher chargeback risk.

## What each page does

- `/confirmed` — confirms General Admission and can one-click VIP directly below the welcome video.
- `/offer/vip-upgrade` — full VIP offer page with one-click or checkout fallback.
- `/offer/implementation-vault` — confirms VIP and can one-click the Vault below the video.
- `/strategy-intensive` — confirms the Vault, shows real seat inventory, and sends the buyer to full checkout.
- `/next-steps` — confirms the highest verified level: GA, VIP, Vault, or Intensive.

Every “No thanks” action goes to `/next-steps` and confirms what the buyer
already owns.

## Server-only one-click settings

```text
COMMAS_ONE_CLICK_ENABLED=false
COMMAS_API_ENV=sandbox
COMMAS_API_KEY=[SANDBOX API KEY]
COMMAS_PRODUCT_ID_VIP_UPGRADE=[VIP SERVICE ID]
COMMAS_PRODUCT_ID_VAULT=[VAULT SERVICE ID]
```

Normal checkout links remain configured at all times as fallback.

## Live Day 2 conversion timing

- Main Summit close: Sunday, August 30 at 4:00 PM Eastern.
- GA-to-VIP reset and upgrade window: 4:00–4:15 PM Eastern.
- VIP Build Lab: 4:15–5:45 PM Eastern.
- Vault offer: final part of the VIP Build Lab.
- Verified Vault buyers continue to the Intensive page immediately.

The VIP and Vault actions must be tested in sandbox and ready in the room chat,
email, and consented SMS before Day 2 begins.

## No-payment owner walkthrough

Start on the Lovable private preview host:

`/?qaStage=anonymous`

Preview mode advances through every step without calling Commas, charging a
card, creating an order, granting an entitlement, or changing seat inventory.

## Live activation order

1. Create all four Commas products.
2. Paste each checkout URL into its matching browser environment variable.
3. Set the success return URL on each Commas product.
4. Configure signed webhooks and legal pages.
5. Apply the one-click audit migration.
6. Use a sandbox key with `COMMAS_API_ENV=sandbox`.
7. Test GA checkout → one-click VIP → one-click Vault → full Intensive checkout.
8. Test double taps, refreshes, timeouts, missing cards, and declined cards.
9. Test the full no-payment owner walkthrough on mobile and desktop.
10. Run one controlled internal live purchase.
11. Switch one-click to production only after every sandbox test passes.
