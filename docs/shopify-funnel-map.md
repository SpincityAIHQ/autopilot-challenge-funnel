# Shopify Funnel Map

## Active reservation funnel

The homepage captures the lead first. The visitor then watches one VSL per
decision page and chooses the ticket level that fits.

| Decision      | Page             | Visitor action                   | Price | Shopify configuration           |
| ------------- | ---------------- | -------------------------------- | ----: | ------------------------------- |
| Reserve GA    | `/`              | Submit name, email, and phone    |    $0 | None                            |
| Get GA        | `/reserve/vip`   | Buy General Admission            |   $22 | `VITE_SHOPIFY_URL_GA`           |
| Review VIP    | `/reserve/vip`   | Continue to the VIP VSL          |    $0 | None                            |
| Get VIP       | `/reserve/vault` | Buy Summit + VIP                 |   $99 | `VITE_SHOPIFY_URL_GA_VIP`       |
| Get Vault Key | `/reserve/vault` | Buy Summit + VIP + Emerald Vault |  $298 | `VITE_SHOPIFY_URL_GA_VIP_VAULT` |

## Permanent Shopify cart permalinks

- General Admission: `https://spincityhq.com/cart/50980696129783:1?checkout`
- Summit + VIP: `https://spincityhq.com/cart/50980697571575:1?checkout`
- Summit + VIP + Emerald Vault Key:
  `https://spincityhq.com/cart/50980698194167:1?checkout`

Do not paste a `/checkouts/cn/` URL into the application. That is a temporary
checkout session tied to a single cart and can expire or redirect a new buyer
away from checkout.

## Confirmation VSL

Shopify completes payment on its own checkout. The Shopify Thank You page
should display a clear button labeled:

`WATCH YOUR CONFIRMATION VIDEO + GET NEXT STEPS`

That button points to:

`https://autopilot-challenge-funnel.lovable.app/confirmed`

The confirmation page hosts the thank-you VSL, email and text instructions,
calendar links, and preparation steps. It does not present another offer.

## Owner QA

The private owner preview can still walk through the VSL layout without
opening a payment provider. Live production payment buttons use only the three
allowlisted Shopify cart permalinks above.
