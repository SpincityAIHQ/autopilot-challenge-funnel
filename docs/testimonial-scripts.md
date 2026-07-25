# Testimonial collection scripts — AI AutoPilot Summit

Ready-to-send scripts for collecting **real, released** video and text
testimonials at every stage of the sequential ascension funnel. Nothing in
this document is a suggested word-for-word script for the client to read.
Every published testimonial must be in the client's own voice, reflect
their own experience, and cover only claims they can verify.

## Ground rules

- **No fabricated results.** If a client can't state a number honestly,
  don't publish a number. Publish the transformation instead.
- **No implied income promises.** "Sales grew" without context implies
  cause-and-effect we can't warrant.
- **Written release required.** Save a signed release covering name,
  face, voice, quote, results, likeness, and permission to publish on
  the Summit site, email, and social.
- **Correct any error immediately.** If a client asks to change or
  remove a quote, remove it that day and keep evidence of the request.
- **Draft-first workflow.** Load new records into `src/lib/testimonials.ts`
  with `status: "draft"`. Nothing renders publicly until `status: "published"`.

## Stage 1 · Landing page

Audience: cold visitors who don't yet know NuAmenti. The testimonial answers
"why do these people trust this family?" — not "how much money did they make?"

### 45–60 second video framework

1. **Before-state** (10s) — one sentence about the wall they were hitting
   before finding NuAmenti.
2. **Moment of clarity** (15s) — the first thing that shifted for them.
3. **Concrete change** (20s) — the one specific thing they now do
   differently in their business.
4. **Who they'd recommend it to** (10s) — a plain "if you are ____, this
   is for you" close.

### Text prompt (2–4 sentences)

> In your own words: what were you stuck on before you found NuAmenti,
> what changed after your first Summit, and who would you tell about it?
> Please only mention numbers or outcomes you can verify with your own
> records.

### Outreach message

> Hey ____ — the Summit is opening registration for Aug 24–25. Would you
> record a 45–60 second phone-camera video sharing what you were stuck on
> before, what shifted, and who you'd tell about it? I'll send a short
> release once you're happy with the take. Zero pressure — one take is
> perfect.

## Stage 2 · $22 checkout

Audience: someone about to make a $22 first-step decision. This testimonial
answers "was the first step worth it?"

### 45–60s video framework

1. Why they trusted Spin / NuAmenti enough to buy in.
2. The moment inside the Summit that made $22 feel like the right call.
3. What they'd say to someone hesitating on the checkout page.

### Text prompt

> Tell me about the decision to reserve your Summit seat. What made
> saying yes feel worth it once you were inside the room?

## Stage 3 · $77 VIP Implementation Experience

Audience: verified GA holders deciding whether deeper implementation
matters. This is about the value of recordings, the VIP Implementation
Lab, priority Q&A, and the outreach vault.

### 45–60s video framework

1. Which VIP benefit they actually used (Lab, recordings, priority Q&A,
   or the outreach kit).
2. One specific thing they built or shipped because of that benefit.
3. Why they'd pick VIP again.

### Text prompt

> Which VIP benefit — the Lab, recordings, priority Q&A, or the outreach
> kit — moved the needle for you, and what did you do with it?

## Stage 4 · $199 Implementation Vault

Audience: verified VIP registrants. This is where numbers can start to
appear — but only ones the client can verify from their own records.

### 45–60s video framework

1. Which Vault tool/template/system they actually used.
2. What they built with it.
3. A measurable operational result: hours saved per week, response time
   cut, number of proposals sent, or another concrete metric they can
   verify.

### Text prompt

> Which Vault asset did you pick up first? What did you build with it,
> and what operational result can you point at? Only include numbers you
> can verify from your own records.

## Stage 5 · $1,000 Strategy & Build Intensive

Audience: verified Vault holders. The strongest, most specific testimonial
in the funnel — a private 1-on-1 either produced something concrete or it
didn't.

### 45–60s video framework

1. The bottleneck they walked in with.
2. What was diagnosed or built together during the two-hour session.
3. The immediate deliverable they left with.
4. The measurable business impact they've seen since (only what they can
   verify).

### Text prompt

> Walk me through your Intensive: the bottleneck you brought, what we
> built together, what you left the session with, and any measurable
> business impact you've seen since.

## Release / permission checklist

Before publishing any testimonial (video or text):

- [ ] Signed release on file (name, face, voice, quote, likeness).
- [ ] Client has reviewed the exact published quote/edit.
- [ ] Every claim maps to something the client can produce evidence for.
- [ ] No customer-of-the-client PII visible in the recording or quote.
- [ ] Registered in `src/lib/testimonials.ts` under the correct page key.
- [ ] `status` flipped from `"draft"` to `"published"` only after all of
      the above.

## Evidence rule

If a testimonial states a number (revenue, hours saved, response time,
sales, etc.), the client must be able to hand you the source of that
number on request (screenshot, export, dashboard). If they can't, publish
the transformation — never the number.
