# Native email pass — status

Done (preview only, nothing enabled, nothing sent):
- [x] `ACADEMY_MESSAGE_TRANSPORT` lovable|ghl|off (default lovable) + `ACADEMY_NATIVE_EMAIL_ENABLED` gate (false)
- [x] Five branded templates + registry (welcome, access activated, purchase code, 24h never started, inactivity)
- [x] Native dispatcher with accepted/cancelled/unknown contract, stable idempotency, documented purpose
- [x] Queue integration: no blanket GHL early return; unavailable transport holds without consuming an attempt
- [x] Purchase access-code delivery no longer GHL-dependent
- [x] Owner-only preview/test route (no queue access, owner recipient only)
- [x] 14 focused tests, typecheck, production build
- [x] Operator docs

Open (owner action required):
- [ ] Owner inbox tests of each template, then set `ACADEMY_NATIVE_EMAIL_ENABLED=true`
- [ ] `ACADEMY_GHL_PAYMENT_WEBHOOK_SECRET` must match the provider — cannot be generated here
- [ ] Native checkout provider decision (out of scope for this pass)

## Free training access (Sep 13, preview only)
- [x] Signed-out /class no longer says "Recording not connected yet"; it invites a free account
- [x] Player shows retry guidance when the Vimeo embed never responds
- [ ] Owner: confirm the free video's Vimeo privacy allows embedding on aiautopilotsummit.com
- [ ] Publish after owner approval (not published in this build)
- [x] /join: in-page validation messages, scrolled into view on phones
- [x] /join: bounded auth request so "Working…" cannot stick forever
- [x] Free lesson no longer waits on the paid entitlement lookup
- [x] Optional nurture queueing can no longer close a classroom
- [x] Signed-in lesson errors offer retry instead of a purchase page
- [x] Video player reports its own playback errors

## Open week — payments off (Sep 16)
- [x] Every checkout, price and payment button removed (Summit, Vault, Accelerator, reserve, offer, /checkout)
- [x] `academyCheckoutUrl` returns null; `/api/public/checkout/$tier` redirects to /summit; `PAYMENTS_ENABLED = false`
- [x] `ACADEMY_OPEN_ACCESS_UNTIL` (set 2026-09-24T04:00:00Z, preview + server secret) opens GA/VIP/Vault to every signed-in learner; Accelerator excluded
- [x] Donate / Accelerator / consultation by text to 510-747-5291; Skool community link
- [x] Tutor told payments are off and everything is free this week
- [x] 8 new tests; typecheck, build, suite green (same 12 pre-existing failures)
- [ ] Owner: publish to take the free week live; clear `ACADEMY_OPEN_ACCESS_UNTIL` to close it
