# Email automation: run the sequences on Lovable, keep GHL optional

## How it works today

Your app already has a full automation engine — what it is missing is a working way to actually send the email.

1. Something happens (someone signs up, buys a ticket, goes quiet for 24/48h).
2. A message is queued in the database with the right timing, consent rules and eligibility checks.
3. A scheduler wakes up, re-checks eligibility, and hands the message to a sender.
4. Step 4 is the problem: the only sender wired in is GoHighLevel, and it stays switched off until GHL credentials are in place. So messages get prepared and never leave.

Meanwhile, your own sending domain (notify.nuamenti.com) is already verified and live on Lovable — it is what sends your sign-in and confirmation emails today. That same channel can send the automation emails, with delivery, bounce handling, unsubscribes and rate limits managed for you.

## What I propose

Make Lovable the email sender for your sequences, and leave GHL as an optional add-on rather than a blocker.

- Add a sender setting with three modes: Lovable email (new default), GHL, or off.
- Build branded email templates in your green/gold/black style for the messages the app already queues:
  - Welcome / account ready
  - 24h "never started" nudge
  - 48h inactivity recovery, based on saved progress
  - Access-ready note after a verified purchase and activation
- Keep every existing guard exactly as-is: consent required, verified purchase checks, suppression, daily caps, dedupe, quiet hours, late eligibility re-check before each send.
- Text messages stay with GHL. Lovable sends email only, so SMS keeps waiting on your GHL connection.
- Nothing is broadcast automatically. Sends stay behind the existing enable flags until you confirm a test email landed in your own inbox.

## Trade-offs

- Lovable adds a small unsubscribe footer to marketing-style emails and hosts the unsubscribe page. That cannot be turned off, and account/sign-in emails are unaffected.
- No bulk blasts through the app: each email is triggered by one person's action. A one-time campaign to your existing list still belongs in a mail tool with your CSV.
- If GHL is connected later, contacts and SMS still flow there; you can flip the sender back with one setting.

## Technical notes

- Register templates in `src/lib/email-templates/registry.ts` and send through the scaffolded `sendTemplateEmail` helper (`send-email.ts`), which is already configured for `notify.nuamenti.com`.
- Add `ACADEMY_MESSAGE_TRANSPORT` (`lovable` | `ghl` | `off`) read in `src/lib/academy-integrations.server.ts`; when `lovable`, route the prepared draft to `sendTemplateEmail` instead of `dispatchAcademyGhl`, mapping the message type to a template name.
- Record the same receipt/status shape used today (`sent`, `suppressed` on `{ sent:false, reason:'recipient_suppressed' }`, `failed` on throw) so the queue, audits and analytics stay unchanged.
- SMS-policy rows (`policy.sms`) continue to require the GHL transport; when it is unavailable they stay queued exactly as now.
- No changes to checkout, entitlements, Thoth, or Auth email templates.

## Verification before anything goes out

1. Send one test of each template to your inbox only.
2. Confirm branding, links and the unsubscribe footer.
3. Then turn the sequence flags on.

## Can Lovable be the one-stop shop? (payments)

Yes for the two pieces you are fighting with — email and checkout.

**Email:** covered above. Your verified sender is already live here.

**Payments:** Lovable has built-in checkout (Stripe or Paddle) that does not need your own merchant account to start, and it can sell GA $22, VIP $99, Emerald $298 and the $4,000 Accelerator as digital products. Because the payment confirmation would then land inside this app, ticket access could be granted automatically the moment a payment clears — no manual matching, no code emails by hand. That is the part the fastpaydirect/GHL links cannot do reliably today.

Trade-offs to know before switching:
- Existing GHL/fastpaydirect payment links stay valid; the app would gain a second, native checkout path. Running both means two places to reconcile, so it is cleaner to pick one going forward.
- Products and prices have to be recreated on the new provider; past Shopify/Zelle/Cash App buyers are unaffected and keep their granted access.
- Requires a Pro plan, and live payments need identity verification with the provider before real money moves. A test mode works immediately.

Suggested order:
1. Ship the Lovable email sequences (above) — smallest change, unblocks nurture today.
2. Then decide on native checkout. If yes, I run the provider eligibility check, enable it, create the four tiers, and wire payment-confirmed to automatic access grants.

**What stays in GHL:** SMS/text, phone, pipeline and CRM records. Lovable does not send texts.
