# Commas / FanBasis Funnel Map

Use one separate Commas product and checkout link for each paid step.

| Step | Offer page | Price | Checkout env placeholder | Commas success redirect / confirmation page |
|---|---|---:|---|---|
| 1 | `/checkout` | $22 | `VITE_COMMAS_CHECKOUT_URL_GA=[PASTE GA COMMAS LINK]` | `/confirmed` |
| 2 | `/offer/vip-upgrade` | $77 | `VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE=[PASTE VIP COMMAS LINK]` | `/offer/implementation-vault` |
| 3 | `/offer/implementation-vault` | $199 | `VITE_COMMAS_CHECKOUT_URL_VAULT=[PASTE VAULT COMMAS LINK]` | `/strategy-intensive` |
| 4 | `/strategy-intensive` | $1,000 | `VITE_COMMAS_CHECKOUT_URL_INTENSIVE=[PASTE INTENSIVE COMMAS LINK]` | `/next-steps` |

## What each redirect page does

- `/confirmed` — confirms General Admission and presents the $77 VIP offer.
- `/offer/implementation-vault` — confirms VIP and presents the $199 Vault.
- `/strategy-intensive` — confirms the Vault and presents the $1,000 private 1-on-1.
- `/next-steps` — confirms the private 1-on-1 and gives final scheduling / event instructions.

## No-payment owner walkthrough

Start here on the Lovable private preview host:

`/?qaStage=anonymous`

Then click the main buttons normally. Preview mode advances through every step without calling Commas, charging a card, creating an order, granting an entitlement, or changing seat inventory.

## Live activation order

1. Create all four Commas products.
2. Paste each checkout URL into its matching environment variable.
3. Set the success return URL shown in the table on the matching Commas product.
4. Keep sales gates OFF until signed webhook tests and legal review are complete.
5. Turn on GA, upsell, and Intensive gates only after the complete paid path is verified.
