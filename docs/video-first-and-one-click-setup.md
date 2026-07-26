# Video-First Funnel + Commas One-Click Setup

## Final page order

Every funnel page follows the same mobile-first order:

1. One clear headline.
2. Responsive 16:9 video.
3. Primary join or upgrade action directly under the video.
4. Respectful “No thanks” option on paid add-ons.
5. Detailed copy, benefits, proof, and FAQs below for people who want to read.

The landing page is intentionally:

`headline → VSL → Reserve Your Seat → supporting copy`

## Autoplay behavior

Funnel videos use YouTube or Vimeo embeds and request:

- autoplay
- muted playback
- inline mobile playback
- visible player controls

Modern mobile browsers normally block autoplay with sound. The video therefore
starts muted where the browser allows it, and the page tells the viewer to tap
the player for sound. Do not attempt to bypass browser autoplay rules with fake
controls or forced audio.

Test every final video on a real iPhone and Android device before launch.

## One-click post-purchase upsells

Commas can charge an existing customer's saved payment method without opening a
new checkout page. This funnel uses that capability only for:

- VIP Implementation Experience — $77
- AI AutoPilot Implementation Vault — $199

The $1,000 Strategy & Build Intensive keeps a full Commas checkout because it
has hard-cap seat inventory and materially higher chargeback risk.

### What the buyer sees

When Commas returns an eligible saved card, the CTA displays the exact amount
and only the safe card label:

`Add VIP · $77 with Visa •••• 4242`

The line beneath the CTA states that one click authorizes a one-time charge and
that it is not a subscription.

The browser never receives:

- Commas API key
- customer ID
- payment-method ID
- full card data
- buyer email
- server-authoritative amount

If a saved card cannot be found or Commas one-click is unavailable, the button
falls back to the standard secure Commas checkout link.

## Required server variables

```text
COMMAS_ONE_CLICK_ENABLED=false
COMMAS_API_ENV=sandbox
COMMAS_API_KEY=[SANDBOX API KEY]

COMMAS_PRODUCT_ID_VIP_UPGRADE=[SANDBOX VIP SERVICE ID]
COMMAS_PRODUCT_ID_VAULT=[SANDBOX VAULT SERVICE ID]
```

The normal browser checkout URLs must also remain configured as a fallback:

```text
VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE=[VIP CHECKOUT LINK]
VITE_COMMAS_CHECKOUT_URL_VAULT=[VAULT CHECKOUT LINK]
```

## Security flow

1. The page requires a verified HttpOnly Summit session.
2. The server derives the buyer email and active entitlements from that session.
3. The server checks that the buyer owns the required previous offer.
4. The server finds the exact Commas customer by normalized email.
5. The server returns only card brand and last four digits for confirmation.
6. The buyer clicks the exact one-time amount.
7. The server atomically reserves a charge attempt in Supabase.
8. The server calls Commas with an `Idempotency-Key` header.
9. The server fulfills through the same idempotent `fulfill_summit_payment` RPC
   used by the signed payment webhook.
10. The later webhook safely replays the same payment ID without double
    fulfillment.

Pending, succeeded, and unknown attempts block another one-click attempt for the
same buyer and product. If charge status becomes uncertain, the UI tells the
buyer not to click again and to wait for the receipt or NuAmenti confirmation.

## Sandbox test matrix

Keep production OFF until all cases pass in the Commas sandbox.

### Happy path

1. Complete a sandbox GA checkout using a sandbox test card.
2. Open the verified NuAmenti session.
3. Confirm the VIP button shows the correct card brand, last four, and $77.
4. Click once; confirm exactly one sandbox charge and VIP entitlement.
5. Confirm the buyer continues to the Vault page.
6. Confirm the Vault button shows the correct card and $199.
7. Click once; confirm exactly one sandbox charge and Vault entitlement.
8. Confirm the buyer continues to the Intensive page.

### Duplicate protection

- Double tap the one-click button.
- Refresh during processing.
- Repeat the POST with the same browser session.
- Confirm there is never more than one charge per buyer/product.

### Fallbacks

- Customer has no saved card → standard Commas checkout appears.
- Commas API unavailable → standard Commas checkout appears.
- Saved-card charge declined → standard Commas checkout appears.
- Charge status unknown → no second charge button; operator review required.
- Buyer already owns product → no additional charge.
- Buyer lacks the prior entitlement → request denied.

### Production activation

Only after the complete sandbox matrix passes:

```text
COMMAS_API_ENV=production
COMMAS_API_KEY=[LIVE API KEY]
COMMAS_ONE_CLICK_ENABLED=true
```

Run one controlled live GA → VIP → Vault purchase with an internal card before
opening sales to the public.
