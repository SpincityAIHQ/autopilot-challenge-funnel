# AI AutoPilot Summit — Campaign Playbook

**Audience:** operator / launch team.
**Not a public asset.** Nothing here is legal or compliance advice — every
outbound message must clear your own review before it goes out.

> Every claim about outcomes, revenue, or attendee counts must be true and
> substantiable. No fake proof, no fake scarcity, no fake testimonials.

---

## 1. Campaign spine

| Phase | Dates | Public message | Ask |
|---|---|---|---|
| Warm-up | July 15 – Aug 6, 2026 | "Something we're building for the family." | Watch for InvestFest. |
| InvestFest | Aug 7–9, 2026 | Networking + capture. | Add name + email + explicit consent. |
| NuAmenti 3 launch | Aug 10, 2026 | Proof + capability. | Watch the drop; grab GA if it lands. |
| Summit run-up | Aug 11–23, 2026 | Registration open. GA $22, VIP $77. | Register at /checkout?tier=ga (or vip). |
| Summit live | Aug 24–25, 2026 | "Map It, Build It." Live online. | Show up. Build with us. |
| Post-Summit | Aug 26 – Sept 25 | Vault $199 (verified). Intensive $1,000 (10 total). Mentorship $8,000 (apply). | Choose one next step. |

## 2. Research pattern (observed, not endorsed)

We reviewed public marketing patterns from two Atlanta educators — Ashley
Kirkwood and Justin Burns — as inputs only. We do NOT copy their language,
imply affiliation, or claim their proof.

Observed patterns worth noting (research only):
- Clear promise + one deliverable per day.
- Time-boxed live cohorts with a build outcome.
- Founder / high-tier disclaimer paired with the CTA.

Our own NuAmenti approach differs deliberately:
- Family voice, not corporate.
- Two-day build, not a 5-day pitch runway.
- Post-event ascension is one Vault OTO + one Intensive + one Mentorship —
  not a five-price ladder.

## 3. Email drafts

> All sends go through Mailchimp (planned). Every email includes an unsubscribe
> link and the sender's physical address (SpincityHQ LLC · Atlanta, GA).

### 3.1 InvestFest capture confirmation

Subject: You're on the family list.

> Hey {first_name} — thanks for saying hi in Atlanta. You're on the list for
> the AI AutoPilot Summit (Aug 24–25, live online). We'll send one note when
> registration opens. That's it. Reply STOP any time to leave the list.
> — The NuAmenti family

### 3.2 Summit registration open

Subject: Two days. One AI-powered offer, running.

> Doors are open for the AI AutoPilot Summit (Aug 24–25, live online).
> - GA — $22 · both days + Action Guide + Scorecard + Buyer Canvas
> - VIP — $77 · everything in GA + recordings + Implementation Lab + priority Q&A
> Pick your seat: {ga_link} · {vip_link}

### 3.3 GA → VIP upgrade (24h post-purchase)

Subject: Recordings included if you upgrade by Aug 20

> {first_name} — quick heads up: GA doesn't include the recordings. If your
> weekend is unpredictable, upgrade to VIP for $55 and you'll have the
> replays for 30 days after the Summit.
> Upgrade: {vip_upgrade_link}

### 3.4 Vault OTO (post-confirmation)

Subject: The build kit. Optional. Once.

> The Implementation Vault is the $199 kit we hand to anyone we work with —
> prompt stack, site blueprint, 30-day campaign calendar, proposal builder,
> Autonomy Map + SOP templates, affiliate directory. Add it once, keep it.
> {vault_link}

### 3.5 Intensive (post-Summit, verified attendees only)

Subject: 10 seats — 2-hour Strategy & Build with the family

> Only 10 people get this. Two hours, 1-to-1-ish, we map + build one thing
> live. It's $1,000. If you want the seat, tap here — inventory is atomic
> and shows current availability. {intensive_link}

### 3.6 Mentorship (application-based)

Subject: 8 weeks. Application only.

> If you're ready to be in the room with us every week for 8 weeks, apply
> here. This is separate from the 10 intensives. {mentorship_apply_link}

## 4. SMS drafts

> Only send to numbers with SMS consent explicitly captured. Quiet hours:
> buyer-local 9pm to 9am. STOP / HELP handled automatically.

- "NuAmenti: AI AutoPilot Summit is Aug 24–25 online. GA $22 / VIP $77. Register {link}. Reply STOP to opt out."
- "NuAmenti: GA → VIP upgrade is $55, keeps you covered with recordings. {link} Reply STOP to opt out."

## 5. AI / prerecorded call scripts (consented seller-specific only)

> Federal TCPA + state analogs require prior express written consent that
> is seller-specific for AI or prerecorded marketing calls. We do NOT dial
> until: consent is stored with copy version, AI disclosure is at the top
> of every call, opt-out is one-touch, and internal + DNC suppression is
> checked. See `src/lib/ai-call.ts`.

Script skeleton:

> "Hi, this is Nova, an AI assistant calling on behalf of NuAmenti. You
> asked us to send you AI AutoPilot Summit updates. Registration opens
> Wed. To stop these calls, press 9 now. If you'd like a human, press 0."

## 6. DM outreach

We do NOT automate DMs. Manual, opted-in, real-conversation only. Suggested
skeleton (human sends):

> "{first_name} — noticed your last post about {specific}. Thought of you
> for the Summit we're running Aug 24–25 (live online). No pitch — happy
> to share the outline if useful."

## 7. Affiliate / attribution rules

- Every outbound campaign includes `utm_source`, `utm_medium`, `utm_campaign`,
  `utm_content`. First-touch + last-touch are captured client-side (safe,
  no PII), and only persisted through the verified purchase path.
- Every tool we teach lives in `src/lib/affiliate-registry.ts` with an
  owner and a status. Placeholders render no clickable link. Live entries
  use `rel="sponsored nofollow noopener noreferrer"` and show the
  disclosure on the same screen.
- Speaker / partner referrals are tracked separately from tool affiliates.

## 8. Refund + reversal policy

- Refunds process through Commas. Webhook receives `payment.refunded`
  (or `payment.failed` / `payment.disputed`) and calls
  `reverse_summit_payment` — entitlements are revoked, intensive slots
  released, access tokens invalidated. This is atomic and idempotent.
- If a buyer email is different from the entitlement email, operator
  intervention is required — the RPC will not guess.
