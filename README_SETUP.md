# AUTOPILOT Challenge Funnel — Current Setup

This is the standalone launch funnel for The AUTOPILOT Challenge. It does not
share code, routes, database tables, payment products, or a domain with the
NuAmenti application.

## Current offer truth

- Core event: Saturday, August 1 and Sunday, August 2, 2026
- Core live build: 12:00–4:00 PM Eastern each day — eight live hours total
- VIP, Bundle, and Founder group hour: 4:00–5:00 PM Eastern each day
- GA: $77
- VIP: $177
- Bundle: $333
- Founder: $1,111, capped at 33 verified purchases
- GA can add recordings + completed Autonomy Map template for $22 inside its
  FanBasis checkout. There is no separate recordings tier or recordings video.
- Promise: build a live monetizable site, launch-ready marketing assets, a
  working lead-and-sales follow-up system, and an Autonomy Map together.
- Sales and income are not guaranteed.

## Customer funnel

1. `/` — main sales page and landing VSL
2. `/?offer=ga|vip|bundle|founder` — the short tier explainer opened by every
   offer button
3. `/checkout?tier=ga|vip|bundle|founder` — order summary, truth-check VSL, and
   hosted FanBasis handoff
4. `/confirmed?tier=ga|vip|bundle|founder` — tier-specific next steps after the
   matching FanBasis return
5. `/confirmed` — neutral fallback when no tier return context is present

The tier in a return URL only chooses public instructions. It never grants
access. The verified FanBasis webhook, receipt, and official access email are
the authority for the buyer's tier and benefits.

Use `/preview-nav` to click through every state before promotion. It is unlinked
and `noindex`, but it is not password-protected. Remove or protect it before the
final public launch if that exposure is not acceptable.

## VSL configuration

Add these browser-visible environment variables in the standalone Lovable
project. Values must be YouTube or Vimeo URLs. Missing or invalid values render
nothing; customers never see an empty player or build note.

| Environment variable | Customer placement |
| --- | --- |
| `VITE_CHALLENGE_VIDEO_HERO` | Main page: what we build in eight live hours |
| `VITE_CHALLENGE_VIDEO_OFFER_GA` | GA offer-click explainer |
| `VITE_CHALLENGE_VIDEO_OFFER_VIP` | VIP offer-click explainer |
| `VITE_CHALLENGE_VIDEO_OFFER_BUNDLE` | Bundle offer-click explainer |
| `VITE_CHALLENGE_VIDEO_OFFER_FOUNDER` | Founder offer-click explainer |
| `VITE_CHALLENGE_VIDEO_CHECKOUT` | Final checkout truth-check |
| `VITE_CHALLENGE_VIDEO_CONFIRMED` | Optional generic confirmation fallback |
| `VITE_CHALLENGE_VIDEO_CONFIRMED_GA` | GA confirmation and next steps |
| `VITE_CHALLENGE_VIDEO_CONFIRMED_VIP` | VIP confirmation and next steps |
| `VITE_CHALLENGE_VIDEO_CONFIRMED_BUNDLE` | Bundle confirmation and next steps |
| `VITE_CHALLENGE_VIDEO_CONFIRMED_FOUNDER` | Founder confirmation and next steps |

There are intentionally no Day 1, Day 2, or recordings-add-on video variables.

## HeyGen Live AI Spin slot

The AI Spin section sits after the tier cards and stays hidden until all three
values below are set:

| Environment variable | Required value |
| --- | --- |
| `VITE_AI_SPIN_ENABLED` | `true` |
| `VITE_AI_SPIN_LIMITS_VERIFIED` | `true` only after the real limits are tested |
| `VITE_HEYGEN_LIVE_AVATAR_EMBED_URL` | Approved HTTPS HeyGen live-avatar embed URL |

The customer disclosure says AI Spin is an AI avatar, recommends the lowest
sufficient tier, and ends after five visitor messages or four minutes. The
iframe component does not create those controls by itself. Do not set
`VITE_AI_SPIN_LIMITS_VERIFIED=true` until the HeyGen/session layer actually
enforces both limits and a refresh cannot restart unlimited consulting.

Never place a HeyGen API key in a `VITE_` variable or client source.

## FanBasis hosted checkouts

Browser-visible configuration:

| Environment variable | Product |
| --- | --- |
| `VITE_CHALLENGE_SALES_ENABLED` | Must equal `true` before any payment handoff is enabled |
| `VITE_COMMAS_CHECKOUT_URL_GA` | FanBasis GA checkout — $77 |
| `VITE_COMMAS_CHECKOUT_URL_VIP` | FanBasis VIP checkout — $177 |
| `VITE_COMMAS_CHECKOUT_URL_BUNDLE` | FanBasis Bundle checkout — $333 |
| `VITE_COMMAS_CHECKOUT_URL_FOUNDER` | FanBasis Founder checkout — $1,111 |
| `VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS` | Optional exact-match extra hosts; `www.fanbasis.com` is already allowed |

Configure a different success return for each FanBasis product:

```text
GA:      https://NuAmentiLaunch.com/confirmed?tier=ga
VIP:     https://NuAmentiLaunch.com/confirmed?tier=vip
Bundle:  https://NuAmentiLaunch.com/confirmed?tier=bundle
Founder: https://NuAmentiLaunch.com/confirmed?tier=founder
```

Use this cancel/back destination for all four:

```text
https://NuAmentiLaunch.com/#tiers
```

Set the Founder product inventory to exactly 33 at FanBasis. The database cap
protects fulfillment, but the provider cap is also required so a 34th buyer is
not charged and forced into a refund.

## Verified payment webhook

The server endpoint remains `/api/public/webhooks/commas` because that is the
provider contract name used by the existing backend. It is disabled by default.

Required server-only variables:

- `COMMAS_WEBHOOKS_ENABLED=true`
- `COMMAS_WEBHOOK_SECRET`
- `COMMAS_PRODUCT_ID_GA`
- `COMMAS_PRODUCT_ID_GA_BUMP`
- `COMMAS_PRODUCT_ID_VIP`
- `COMMAS_PRODUCT_ID_BUNDLE`
- `COMMAS_PRODUCT_ID_FOUNDER`

Do not enable production fulfillment until one real FanBasis sandbox payload
and signature pass the full round-trip. Product IDs must be distinct. Prices
must reconcile to $77, $99 only when GA includes the native bump, $177, $333,
or $1,111. Unknown products, wrong totals, and non-USD payments grant nothing.

The confirmation page does not send access email. A verified transactional
email provider still needs to deliver the official join link, workbook, tier
benefits, and Founder onboarding.

## Calendar routes

- `/calendar/day1.ics` — core Day 1, 12–4 PM ET
- `/calendar/day2.ics` — core Day 2, 12–4 PM ET
- `/calendar/day1-vip.ics` — Day 1 plus VIP hour, 12–5 PM ET
- `/calendar/day2-vip.ics` — Day 2 plus VIP hour, 12–5 PM ET

GA confirmation uses the core calendars. VIP, Bundle, and Founder confirmation
uses the extended calendars.

## Pre-launch checklist

- [ ] Buy/connect `NuAmentiLaunch.com` to this project only
- [ ] Upload every VSL and confirm `/preview-nav` shows `READY`
- [ ] Connect HeyGen Live AI Spin and test the five-message/four-minute limits
- [ ] Create all four FanBasis products and the GA native order bump
- [ ] Add each product's exact success return and common cancel URL
- [ ] Cap Founder inventory at 33 in FanBasis
- [ ] Complete one signed sandbox webhook round-trip for every tier and GA bump
- [ ] Send and receive a real access email for every tier
- [ ] Finalize privacy, terms, refund, book shipping, event cancellation, and
  chargeback language
- [ ] Test every page and calendar on desktop and a real phone
- [ ] Confirm no public page displays internal provider/build notes
- [ ] Republish only after payment, fulfillment, email, policies, avatar, and
  domain all pass

## Validation

Current source validation:

```text
88 tests pass
TypeScript type-check passes
Production build passes
```
