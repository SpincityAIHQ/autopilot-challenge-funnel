# Launch runbook — the complete experience, September 9, 2026

The app now automates everything it can. What remains is a short list of human actions, each of which is a credential, a Shopify or GHL setting, a recording, or a send. The live version of this list is the **Launch board** at `/studio` (owner sign-in): every row shows its state and the exact action that turns it green, without exposing any value.

## What the app does on its own once connected

- **Purchase → ticket.** A paid Shopify order arrives by webhook, is reconciled against the Admin API, and each paid line becomes an email-matched ticket. The purchaser creates or signs in to an account with the purchase email, confirms it, and the ticket claims itself. No code. Refunds and cancellations flip the ticket inactive on the next reconciliation. (`ACADEMY_EMAIL_TICKETS_ENABLED`)
- **Purchase → confirmation.** One transactional email per paid line to the purchase email, whether or not an account exists yet, plus SMS when the purchaser already has an account with SMS consent. The sender re-reads the order and grant before every attempt.
- **Sign-up → welcome.** Welcome email (and SMS with consent) through the GHL inbound workflow, every five minutes via pg_cron.
- **Learning → coaching.** SPINXP decides the reason and timing (drop-off, practice, stalled, feedback, approval); Thoth or AI Spin adds wording; local daytime and a daily cap apply. (`ACADEMY_LEARNING_NUDGES_ENABLED`)
- **Recordings → guides.** Vimeo slots play with watch telemetry; captions flow in through the Vimeo API when `VIMEO_ACCESS_TOKEN` is set; the guides cite timestamps.
- **Historical purchasers.** The imported tickets already in the database activate the moment the purchaser signs in with the purchase email.

## Human side, in order

1. **Shopify (15 minutes).** In Shopify admin, create a custom app with `read_orders`. Copy the shop domain (`*.myshopify.com`), the Admin API access token and a webhook signing secret into Lovable → Project Settings → Secrets as `ACADEMY_SHOPIFY_SHOP`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `ACADEMY_SHOPIFY_WEBHOOK_SECRET`. Subscribe `orders/paid`, `orders/updated`, `orders/cancelled`, `refunds/create` to `https://aiautopilotsummit.com/api/public/webhooks/shopify`. Set `ACADEMY_SHOPIFY_ENABLED=true`, `ACADEMY_EMAIL_TICKETS_ENABLED=true`, and `ACADEMY_ACCELERATOR_ENDS_AT` (the programme end, ISO 8601). Confirm the Accelerator product's checkout link is configured.
2. **GHL inbound workflow (20 minutes).** Open the workflow behind `ACADEMY_GHL_WEBHOOK_URL`. Verify the email action's sender. Add an SMS action that runs only when `send_sms` is true. Branch on `event_name`: `webinar_registered` (welcome), `purchase_confirmed` (ticket ready), `learning_*` (coaching), `webinar_not_started`. Use `message_subject`, `message_html`/`message_text` and `sms_text` from the payload. Send a test to your own inbox and phone.
3. **Prove the loop (10 minutes).** Sign up with a fresh email. Welcome email within 10 minutes. Then place a real $22 General Admission order with a second email, and confirm: purchase confirmation arrives, creating an account with that email unlocks Summit Day 1 and Day 2 with no code.
4. **Recordings (as they are ready).** Paste Vimeo links into the seven lesson slots and each Accelerator day. Add `VIMEO_ACCESS_TOKEN` and turn on auto-captions on each upload so transcripts arrive on their own. Day 1 VIP and the Emerald intensive transcripts are already bundled.
5. **Welcome videos.** Record from the filming pack and paste into `VITE_ACADEMY_VSL_URL`, `VITE_ACADEMY_VSL_SUMMIT`, `VITE_ACADEMY_VSL_VAULT`, `VITE_ACADEMY_VSL_ACCELERATOR`.
6. **Guides.** `ACADEMY_BOOKING_URL` for the 1-on-1 calendar. For the live avatar: `LIVEAVATAR_API_KEY`, `LIVEAVATAR_AVATAR_ID`, `LIVEAVATAR_VOICE_ID`, `ACADEMY_AVATAR_ENABLED=true`, then run one session yourself. `ACADEMY_LEARNING_NUDGES_ENABLED=true` once the welcome email is verified; `ACADEMY_THOTH_MESSAGES_ENABLED=true` if you want AI-personalised wording.
7. **Blast.** From GHL or Mailchimp, send the launch email to registrants, purchasers and the waitlist with the join link. Purchasers get one instruction: create your account with your purchase email and your ticket activates itself.
8. **Watch the board.** `/studio` shows every row. Green across the blocking rows means the complete experience is live.

## What is still unverified from inside the app

Inbox and phone delivery are only proven by your own test. Shopify webhook subscriptions can only be confirmed in the Shopify admin or by the app once the token exists. The Vimeo caption pull and the live avatar were built from documentation and need one real run each.
