# Roadmap

## Native Lovable email (Sept 11 direction) — in progress
- [ ] Template families: welcome/account-ready, 24h never-started, 48h inactivity, access-activated, purchase access code
- [ ] Event -> template mapping; unsupported events held (fail closed)
- [ ] ACADEMY_MESSAGE_TRANSPORT = lovable|ghl|off (default lovable); native send gate ACADEMY_NATIVE_EMAIL_ENABLED default false
- [ ] Remove blanket GHL-ready early return for native email in academy-integrations.server.ts
- [ ] Native path in academy-delivery.server.ts for purchase access codes (stable delivery key)
- [ ] Owner-only test harness (server-only auth, verified owner recipient, cannot drain backlog)
- [ ] Tests: native/off/ghl, SMS+CRM pending without attempt burn, purpose mapping, suppression->cancelled, unknown on ambiguous, idempotency, owner isolation
- [ ] Typecheck + build; update operator docs with flags and remaining activation steps

## Deferred (not this pass)
- Native checkout / payment provider enablement (docs note only)
- Any real sends, owner inbox tests, publication
