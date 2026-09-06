# Backend configuration diagnosis — learning platform server routes

## Verified findings (checked this run, not assumed)

1. The managed backend credentials ARE present in the running preview server process, contrary to the earlier conclusion:
   - Backend URL, publishable key, service-role key, rate-limit secret and the managed AI key are all present in the dev server's own environment.
   - The service-role connection works: direct reads against `academy_profiles`, `academy_grants`, `academy_progress`, `academy_tutor_messages` and `summit_reservations` all returned success.
   - So `RATE_LIMIT_HMAC_SECRET` is NOT missing, and the admin client is NOT unconfigured. No secret needs to be pasted anywhere.

2. The earlier HTTP 503 was therefore not a credentials problem. The learning API today returns **401**, not 503:
   - `POST /api/academy/lesson` → 401
   - `GET /api/academy/lesson?lessonId=...` → 401
   401 is the correct, secure response: those routes require a verified signed-in learner, and my requests carried no learner session.

3. Nothing about the tutor's live behaviour is proven by the flag being on or by an anonymous call. Every learner-scoped path is still unverified end to end.

## Answers to the specific questions

- **Which client should these routes use?** The platform-generated admin client already in the project (`src/integrations/supabase/client.server.ts`), loaded inside handlers. That is the managed binding; it reads the platform-injected backend URL and service-role key. No hand-rolled client, no alternative binding.
- **Are Cloud credentials only injected at deployed runtime?** No. They are injected into the preview server runtime too, and were confirmed working here. There is no development-only restriction to work around.
- **Does the owner need to repair a backend binding?** No repair is indicated. If a future run genuinely reports a missing backend variable, the supported fix is a backend re-bind from the project's backend settings (View Backend), never entering a reserved backend key by hand — reserved backend names cannot be set as ordinary secrets.
- **Secure input for the rate-limit secret?** It already exists and is set. If it ever needs changing, the supported place is Project Settings → Secrets; it is not a reserved name, so it accepts a value there.

## The one real remaining block

Verifying free lesson, server-scored quiz, workbook save/read, learner isolation, paid-lesson denial and a grounded tutor answer requires an authenticated learner session. Creating accounts is out of scope for this diagnosis-only run.

## Exact supported next action

Choose one:

- **A.** You sign up on the preview site with a throwaway address you control and tell me when you are in; I then walk the six checks against that session and report evidence.
- **B.** You authorize me, in a follow-up build-mode message, to create two clearly synthetic QA accounts through the existing server admin path, run the six checks, then delete them and their records and confirm cleanup.

No code, flags, publishing or security settings change either way until you pick.
