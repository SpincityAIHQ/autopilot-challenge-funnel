# AI AutoPilot Summit — Campaign Playbook

Purpose. Ready-to-customize outreach for the two-day live Summit on
Aug 24–25, 2026 and its post-Summit ladder. Every message has
placeholders in `[BRACKETS]` for the operator to fill.

Non-negotiables.
- No earnings promises, invented scarcity, invented attendee counts, or
  claims about partners.
- Ashley Kirkwood and Justin Burns are previously observed research
  inputs only. No fresh mailbox audit was performed for this document;
  no partnership or affiliation is implied.
- No "add it once, keep it," "we hand this to anyone," "1-to-1-ish,"
  Wednesday-only claims, or lifetime access implied anywhere.
- Say "AI Spin" for the AI presenter concept. Do not use "Nova."
- Email opt-out language: "unsubscribe below" or the platform footer.
- SMS opt-out language: reply STOP; help via reply HELP.
- AI/prerecorded calls need explicit seller-specific written consent,
  AI disclosure at the start, and honor DNC + state quiet hours.
- Consent per channel is unbundled, unchecked by default, and never a
  condition of purchase.
- Suppress buyers from further sales sequences the moment fulfillment is
  confirmed by webhook. Never continue selling a product a buyer already
  owns.

Segments used below.
- LIST_INTEREST — opted-in email prospects who have not registered.
- LIST_GA — confirmed GA registrants.
- LIST_VIP — confirmed VIP registrants (includes GA→VIP upgrades).
- LIST_VAULT — confirmed Vault buyers.
- LIST_INTENSIVE_ELIGIBLE — Summit registrants + operator-added eligibles.
- LIST_MENTORSHIP_APPLICANTS — submitted /apply/mentorship.
- SUPPRESS: for every offer, exclude anyone in the buyer list for that
  offer + anyone who declined via a documented opt-out.

------------------------------------------------------------
## 1 · Transactional emails (always sent; no marketing consent needed)

### 1a. GA receipt + access
Subject: You're in — AI AutoPilot Summit (GA)
Preview: Save Aug 24 + 25. Access details inside.

Hi [FIRST_NAME],

Thank you, family — you're officially registered with the GA Ticket to
the AI AutoPilot Summit on Aug 24 + 25, 2026 (live online).

- Add to calendar: [DAY_1_ICS_URL] · [DAY_2_ICS_URL]
- Your next steps: [https://SITE/next-steps]
- Session start times are sent from this address a few days before Day 1.

Optional add-ons:
- Upgrade to VIP for $55 (recordings + VIP Lab): [https://SITE/offer/vip-upgrade]
- Implementation Vault ($199, independent add-on): [https://SITE/offer/implementation-vault]

Questions? Reply to this email or write Info@NuAmenti.com.
— The NuAmenti team

### 1b. VIP receipt + access
Subject: You're in — AI AutoPilot Summit (VIP)
Body: same shape as 1a, minus the VIP upgrade CTA. Mention 30-day
recordings + VIP Implementation Lab invite arriving separately.

### 1c. Vault receipt (independent scope)
Subject: Your Implementation Vault access is ready
Body: Include the single-use magic link and explain it drops a private
session cookie on first click, then browsing works for a few hours. Note:
Vault does not upgrade GA to VIP; it's a separate scope.

### 1d. Intensive booking confirmation
Subject: Strategy & Build Intensive — slot [SLOT_NUMBER] of 10 confirmed
Body: Include scheduling link, prep questions, and the reminder that the
Intensive is a separate offer from the 8-week Mentorship.

### 1e. Refund / dispute notification
Subject: Your [PRODUCT_NAME] refund has been processed
Body: Confirm access has been revoked and any downstream tickets that
depend on the refunded product are unaffected (or affected, if it was
GA→VIP upgrade being reversed).

------------------------------------------------------------
## 2 · Marketing email sequences (LIST_INTEREST → registered)

Each email ends with the platform unsubscribe link. Suppress a recipient
the moment they register for any Summit tier.

### 2.1 GA nudge (day 0 · pre-registration)
Subject: Two days. Build one AI-powered job with us.
Body:
- The Summit is Aug 24 + 25, 2026 — live online, both days.
- Day 1 you map three jobs AI can take this month. Day 2 you build one.
- GA is $22. VIP is $77 with recordings + Lab.
CTA: [https://SITE/checkout?tier=ga]

### 2.2 Story email (day +2)
Subject: I stopped doing this last month
Body: Short first-person story about handing one recurring job to AI Spin.
No earnings claims. End with the same GA CTA.

### 2.3 VIP framing (day +4)
Subject: The difference between watching and being in the room
Body: Explain the VIP Implementation Lab + priority Q&A. Do not imply
"1-to-1-ish" access.
CTA: [https://SITE/checkout?tier=vip]

### 2.4 Last-call email (day before Summit only, if seats remain)
Subject: We start tomorrow — final GA seats
Body: State the honest capacity note only if operator has real capacity
data. No invented counters. CTA: [https://SITE/checkout?tier=ga]

### 2.5 GA → VIP upgrade (to LIST_GA only)
Subject: One-time GA → VIP upgrade — $55
Body: Explain what you'd add: 30-day recordings, VIP Lab, priority Q&A,
outreach kit. Note that declining leaves your GA ticket fully valid.
CTA: [https://SITE/offer/vip-upgrade]

### 2.6 Vault offer (to LIST_GA + LIST_VIP only, exclude LIST_VAULT)
Subject: The build kit for after the Summit — $199
Body: Explain independent-scope Vault. No claim it upgrades GA or VIP.
CTA: [https://SITE/offer/implementation-vault]

### 2.7 Next-keynote priority (post-Summit; to any consented list)
Subject: Priority list — next NuAmenti keynote
Body: We don't have a date yet. Join the priority list to be told first.
CTA: [https://SITE/next-keynote]

### 2.8 Strategy Intensive invite (to LIST_INTENSIVE_ELIGIBLE, exclude LIST_INTENSIVE)
Subject: Ten seats · Strategy & Build Intensive — $1,000
Body: Two-hour private session. Ten total. Inventory is atomic; a seat
is only yours after verified payment. Not the same as the Mentorship.
CTA: [https://SITE/strategy-intensive]

### 2.9 Mentorship invite (to LIST_INTENSIVE_ELIGIBLE, exclude LIST_MENTORSHIP_APPLICANTS)
Subject: Eight-week Mentorship & Work-Along — application
Body: $8,000. Application does not charge a card. Separate from the
Intensive. Explicitly do not imply a 10-slot cap for the Mentorship
itself.
CTA: [https://SITE/apply/mentorship]

------------------------------------------------------------
## 3 · SMS (consented; STOP/HELP always)

Each SMS ends with `Reply STOP to opt out; HELP for help.` Suppress
buyers from further sales SMS the moment fulfillment is confirmed.

- Pre-Summit reminder (24h): "AI AutoPilot Summit is tomorrow, [START_TIME] ET. Add: [DAY_1_ICS_URL]. Reply STOP to opt out; HELP for help."
- Day-of reminder (2h): "We start in ~2h. Room link: [LINK]. Reply STOP to opt out; HELP for help."
- GA → VIP upgrade (to LIST_GA only): "$55 GA→VIP upgrade — recordings + Lab: [SITE]/offer/vip-upgrade. Reply STOP to opt out; HELP for help."
- Vault (post-Summit, to LIST_GA + LIST_VIP): "Implementation Vault add-on ($199): [SITE]/offer/implementation-vault. Reply STOP to opt out; HELP for help."

Never SMS during buyer-local quiet hours (before 9am / after 8pm) or
without STOP/HELP language. Never SMS a person who is not on
LIST_INTEREST via a documented double-opt-in.

------------------------------------------------------------
## 4 · Manual DMs (operator-sent, human-typed)

Do not automate outbound DMs. Use these only where the platform TOS and
the recipient relationship allow, and where the operator personally
typed and sent the message.

- Warm reply (someone who liked a Summit post):
  "Hey [NAME] — saw you tapped in on the Summit post. It's Aug 24-25,
  two live implementation days. GA is $22. Here's the page:
  [https://SITE]. No pressure — happy to answer anything."

- Post-Summit follow-up (someone who was in the room and posted):
  "[NAME], that thing you shared today is exactly what the Vault
  builds on. If you want the full stack: $199,
  [https://SITE/offer/implementation-vault]. No worries either way."

Do NOT use DMs to run sales sequences without explicit platform +
recipient authorization.

------------------------------------------------------------
## 5 · AI-call scripts (requires explicit written consent)

Use ONLY for recipients on LIST_INTEREST who have separately given
explicit written seller-specific consent to receive AI/prerecorded
calls. Disclose AI at the start. Honor DNC. Respect quiet hours.

### 5.1 Warm reminder call (pre-Summit, if consented)
"Hi [FIRST_NAME], this is AI Spin calling on behalf of NuAmenti — I'm
an AI voice. The AI AutoPilot Summit starts [START_TIME_LOCAL] on
Aug 24. This is a courtesy reminder. To opt out of future NuAmenti
calls, press 9. To speak with a human, press 0. Thank you, family."

### 5.2 Post-Summit ascension call (to LIST_INTENSIVE_ELIGIBLE)
"Hi [FIRST_NAME], this is AI Spin — I'm an AI voice from NuAmenti.
There are [REMAINING] of ten Strategy Intensive slots open at
$1,000. That's separate from the eight-week Mentorship. To opt out,
press 9. To speak with a human, press 0."

No AI call scripts for buyers of the product being offered. No AI
call scripts to numbers not on a documented consent record.

------------------------------------------------------------
## 6 · Suppression + hygiene rules

- On webhook `payment.succeeded` for a product, remove the buyer from
  every sales sequence for that product AND for any prerequisite
  (buying VIP suppresses the GA→VIP upgrade sequence).
- On `payment.refunded` / `payment.disputed`, remove the buyer from
  post-purchase sequences for that product (they're no longer a buyer).
- Never re-add a suppressed contact to a sequence within 30 days.
- Never send more than one Summit-related email per calendar day per
  address in the two weeks before Day 1.

------------------------------------------------------------
## 7 · Research inputs (labeled for transparency)

We previously observed public mechanisms used by other operators such
as Ashley Kirkwood (corporate pitch structures) and Justin Burns
(challenge-into-mentorship flows). Those observations informed the
Summit → Vault → Intensive → Mentorship ladder generally. No fresh
mailbox audit was performed for this playbook and no partnership,
affiliation, or endorsement is implied.
