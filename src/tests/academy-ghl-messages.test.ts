import { test } from "node:test";
import assert from "node:assert/strict";
import { academyGhlTransportReady, dispatchAcademyGhl } from "../lib/academy-ghl-messages.server.ts";

const env = () => ({
  ACADEMY_GHL_TRANSPORT: "api", ACADEMY_GHL_PRIVATE_TOKEN: "mock-private-token",
  ACADEMY_GHL_LOCATION_ID: "mockLocation123", ACADEMY_GHL_EMAIL_FROM: "hello@example.com",
  ACADEMY_GHL_SMS_FROM: "+12025550100",
});
const welcome = () => ({
  event_id: "event-email", event_name: "webinar_registered", email: " LEARNER@EXAMPLE.COM ",
  send_email: true, send_sms: false, sms_consent: false, marketing_consent: false,
  message_subject: "Welcome to the summit", message_text: "Your welcome and webinar primer.", sms_text: "Your welcome SMS.",
});
const sms = () => ({ ...welcome(), event_id: "event-sms", event_name: "webinar_registered_sms", send_email: false,
  send_sms: true, sms_consent: true, phone: "+12025550199" });
function mock() {
  const calls: { path: string; method: string; body: Record<string, any>; headers: Record<string, string> }[] = [];
  const state: { contact: Record<string, any>; mode: string; beforeRead?: () => void } = {
    contact: { id: "contact-1", email: "learner@example.com", locationId: "mockLocation123", phone: "+12025550199", dnd: false,
      dndSettings: { Email: { status: "inactive" }, SMS: { status: "inactive" } } }, mode: "ok",
  };
  const fetchImpl = (async (url: string | URL, init: RequestInit) => {
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://services.leadconnectorhq.com");
    assert.equal(init.redirect, "error");
    const path = parsed.pathname, body = init.body ? JSON.parse(String(init.body)) : {};
    const method = init.method ?? "GET", headers = init.headers as Record<string, string>;
    assert.equal(headers.Version, "v3"); assert.equal(headers.Authorization, "Bearer mock-private-token");
    calls.push({ path, body, method, headers });
    if (path === "/contacts/upsert") {
      if (state.mode === "upsert503") return new Response("private failure", { status: 503 });
      return Response.json({ new: false, contact: state.contact });
    }
    if (path === "/contacts/contact-1" && method === "PUT") {
      if (body.phone) state.contact.phone = body.phone;
      return Response.json({ contact: state.contact });
    }
    if (path === "/contacts/contact-1/tags") return Response.json({ tags: body.tags }, { status: 201 });
    if (path === "/contacts/contact-1" && method === "GET") {
      state.beforeRead?.();
      return Response.json({ contact: state.contact });
    }
    assert.equal(path, "/conversations/messages");
    assert.equal(headers["Idempotency-Key"], undefined, "No unsupported idempotency promise");
    if (state.mode === "timeout") throw new Error("private network detail mock-token");
    if (state.mode === "send403") return new Response("private provider error", { status: 403 });
    if (state.mode === "send500") return new Response("private provider error", { status: 500 });
    if (state.mode === "missingReceipt") return Response.json({ msg: "OK" });
    if (state.mode === "badJson") return new Response("not JSON");
    return Response.json({ messageId: `message-${body.type}`, conversationId: "conversation-1", ...(body.type === "Email" ? { emailMessageId: "email-message-1" } : {}) });
  }) as typeof fetch;
  return { calls, state, fetchImpl, sends: () => calls.filter((x) => x.path === "/conversations/messages") };
}

test("API email normalizes identity and stores real provider IDs without claiming delivery", async () => {
  const m = mock(); let attempts = 0;
  const result = await dispatchAcademyGhl(welcome(), { env: env(), fetchImpl: m.fetchImpl, onAttempt: () => attempts++ });
  assert.equal(result.status, "accepted"); assert.equal(result.receipt.evidence, "provider_accepted");
  assert.equal(result.receipt.messageId, "message-Email"); assert.equal(result.receipt.emailMessageId, "email-message-1");
  assert.equal(attempts, 1);
  assert.deepEqual(m.calls[0].body, { locationId: "mockLocation123", email: "learner@example.com", createNewIfDuplicateAllowed: false });
  assert.equal(m.sends()[0].body.emailTo, "learner@example.com");
  assert.equal(m.sends()[0].body.emailFrom, "hello@example.com");
  assert.equal(m.sends()[0].body.status, "pending");
  assert.equal(m.sends()[0].body.message, welcome().message_text);
  assert.ok(!JSON.stringify(result).includes("learner@example.com"));
  assert.ok(!JSON.stringify(result).includes("mock-private-token"));
});
test("simultaneous email and SMS for one contact produce two independent messages", async () => {
  const m = mock();
  const results = await Promise.all([dispatchAcademyGhl(welcome(), { env: env(), fetchImpl: m.fetchImpl }), dispatchAcademyGhl(sms(), { env: env(), fetchImpl: m.fetchImpl })]);
  assert.deepEqual(results.map((x) => x.status), ["accepted", "accepted"]);
  assert.equal(m.sends().length, 2);
  assert.equal(m.sends().find((x) => x.body.type === "SMS")!.body.message, sms().sms_text);
  assert.equal(m.sends().find((x) => x.body.type === "Email")!.body.message, welcome().message_text);
});
test("CRM sync changes only explicitly present phone and mapped state; no body or DND reset", async () => {
  const m = mock();
  const result = await dispatchAcademyGhl({ ...welcome(), event_name: "customer_preferences_updated", send_email: false, phone: null,
    access_tiers: [], customer_lifecycle: "returning_customer", workbook: "private answer" }, {
    env: { ...env(), ACADEMY_GHL_CONTACT_FIELD_MAP_JSON: JSON.stringify({ marketing_consent: "field-consent", access_tiers: "field-access" }) }, fetchImpl: m.fetchImpl,
  });
  assert.equal(result.receipt.evidence, "contact_synced"); assert.equal(m.sends().length, 0);
  const update = m.calls.find((x) => x.method === "PUT")!;
  assert.deepEqual(update.body, { customFields: [{ id: "field-consent", fieldValue: "false" }, { id: "field-access", fieldValue: "[]" }] });
  assert.ok(!JSON.stringify(m.calls).includes("private answer"));
  assert.equal(m.calls[0].body.tags, undefined, "Upsert never overwrites existing tags");
});
test("absent access snapshot does not erase current GHL fields", async () => {
  const m = mock();
  await dispatchAcademyGhl({ ...welcome(), event_name: "customer_returned", send_email: false }, {
    env: { ...env(), ACADEMY_GHL_CONTACT_FIELD_MAP_JSON: '{"access_tiers":"field-access"}' }, fetchImpl: m.fetchImpl,
  });
  assert.equal(m.calls.filter((x) => x.method === "PUT").length, 0);
});
test("contact email collision is rejected before updating another person's phone", async () => {
  const m = mock(); m.state.contact.email = "other@example.com";
  await assert.rejects(dispatchAcademyGhl(sms(), { env: env(), fetchImpl: m.fetchImpl }), /GHL_CONTACT_IDENTITY_UNVERIFIED/);
  assert.equal(m.calls.length, 1); assert.equal(m.sends().length, 0);
});
test("contact from a different GHL location is rejected", async () => {
  const m = mock(); m.state.contact.locationId = "otherLocation123";
  await assert.rejects(dispatchAcademyGhl(welcome(), { env: env(), fetchImpl: m.fetchImpl }), /GHL_CONTACT_IDENTITY_UNVERIFIED/);
  assert.equal(m.sends().length, 0);
});
test("fresh contact identity change is caught immediately before sending", async () => {
  const m = mock(); m.state.beforeRead = () => { m.state.contact.email = "other@example.com"; };
  await assert.rejects(dispatchAcademyGhl(welcome(), { env: env(), fetchImpl: m.fetchImpl }), /GHL_CONTACT_IDENTITY_UNVERIFIED/);
  assert.equal(m.sends().length, 0);
});
for (const channel of ["Email", "SMS"] as const) {
  test(`${channel} provider opt-out suppresses its send without clearing DND`, async () => {
    const m = mock(); m.state.contact.dndSettings[channel].status = "active"; let attempted = false;
    const result = await dispatchAcademyGhl(channel === "Email" ? welcome() : sms(), { env: env(), fetchImpl: m.fetchImpl, onAttempt: () => { attempted = true; } });
    assert.equal(result.status, "cancelled"); assert.equal(result.receipt.reason, "provider_dnd"); assert.equal(attempted, false);
    assert.equal(m.sends().length, 0); assert.ok(m.calls.every((x) => !("dnd" in x.body) && !("dndSettings" in x.body)));
  });
}
test("global DND and unknown DND each prevent a send", async () => {
  const m = mock(); m.state.contact.dnd = true;
  assert.equal((await dispatchAcademyGhl(welcome(), { env: env(), fetchImpl: m.fetchImpl })).status, "cancelled");
  delete m.state.contact.dnd;
  await assert.rejects(dispatchAcademyGhl(welcome(), { env: env(), fetchImpl: m.fetchImpl }), /GHL_CONTACT_DND_UNAVAILABLE/);
  assert.equal(m.sends().length, 0);
});
test("unknown per-channel suppression status fails closed", async () => {
  const m = mock(); m.state.contact.dndSettings.Email.status = "unknown";
  await assert.rejects(dispatchAcademyGhl(welcome(), { env: env(), fetchImpl: m.fetchImpl }), /GHL_CONTACT_DND_UNAVAILABLE/);
  assert.equal(m.sends().length, 0);
});
test("consent withdrawal or learning resumption during contact sync cancels before send", async () => {
  const m = mock(); let attempted = false;
  const result = await dispatchAcademyGhl(welcome(), { env: env(), fetchImpl: m.fetchImpl,
    beforeSend: async () => false, onAttempt: () => { attempted = true; } });
  assert.equal(result.status, "cancelled"); assert.equal(result.receipt.reason, "eligibility_changed");
  assert.equal(attempted, false); assert.equal(m.sends().length, 0);
});
test("missing sender fails before any contact update or sending attempt", async () => {
  const m = mock(); let attempted = false;
  await assert.rejects(dispatchAcademyGhl(welcome(), { env: { ...env(), ACADEMY_GHL_EMAIL_FROM: "" }, fetchImpl: m.fetchImpl, onAttempt: () => { attempted = true; } }), /GHL_EMAIL_SENDER_NOT_CONFIGURED/);
  await assert.rejects(dispatchAcademyGhl(sms(), { env: { ...env(), ACADEMY_GHL_SMS_FROM: "" }, fetchImpl: m.fetchImpl }), /GHL_SMS_SENDER_NOT_CONFIGURED/);
  assert.equal(m.calls.length, 0); assert.equal(attempted, false);
});
test("unsupported events, unverified purchases and missing consent cannot dispatch", async () => {
  const m = mock();
  for (const payload of [
    { ...welcome(), event_name: "send_anything" },
    { ...welcome(), event_name: "purchase_access_code", purchase_verified: false },
    { ...welcome(), event_name: "learning_dropoff", marketing_consent: false },
    { ...sms(), sms_consent: false }, { ...sms(), phone: undefined },
  ]) assert.equal((await dispatchAcademyGhl(payload, { env: env(), fetchImpl: m.fetchImpl })).status, "cancelled");
  assert.equal(m.calls.length, 0);
});
test("verified purchase email works without marketing consent and raw code stays out of CRM fields", async () => {
  const m = mock(); const result = await dispatchAcademyGhl({ ...welcome(), event_name: "purchase_access_code", purchase_verified: true, access_code: "private-code" }, { env: env(), fetchImpl: m.fetchImpl });
  assert.equal(result.status, "accepted"); assert.ok(!JSON.stringify(m.calls).includes("private-code"));
});
for (const mode of ["timeout", "send403", "send500", "missingReceipt", "badJson"]) {
  test(`${mode} after message submission stays unknown with no retry or webhook fallback`, async () => {
    const m = mock(); m.state.mode = mode; let attempts = 0;
    const result = await dispatchAcademyGhl(welcome(), { env: { ...env(), ACADEMY_GHL_WEBHOOK_URL: "https://services.leadconnectorhq.com/hooks/fixture-only" }, fetchImpl: m.fetchImpl, onAttempt: () => attempts++ });
    assert.equal(result.status, "unknown"); assert.equal(result.receipt.evidence, "outcome_unknown"); assert.equal(m.sends().length, 1); assert.equal(attempts, 1);
    assert.ok(!JSON.stringify(result).includes("private"));
  });
}
test("contact failure is preparation-only and does not mark a message attempted", async () => {
  const m = mock(); m.state.mode = "upsert503"; let attempted = false;
  await assert.rejects(dispatchAcademyGhl(welcome(), { env: env(), fetchImpl: m.fetchImpl, onAttempt: () => { attempted = true; } }), /GHL_CONTACT_SYNC_UNAVAILABLE/);
  assert.equal(attempted, false); assert.equal(m.sends().length, 0);
});
test("explicit API mode cannot silently use a configured legacy webhook", async () => {
  const config = { ...env(), ACADEMY_GHL_PRIVATE_TOKEN: "", ACADEMY_GHL_WEBHOOK_URL: "https://services.leadconnectorhq.com/hooks/fixture-only" };
  assert.equal(academyGhlTransportReady(config), false);
  assert.equal(academyGhlTransportReady({ ...config, ACADEMY_GHL_TRANSPORT: "typo" }), false);
});
test("legacy transport remains explicitly selectable and only records HTTP acceptance", async () => {
  const config = { ACADEMY_GHL_TRANSPORT: "webhook", ACADEMY_GHL_WEBHOOK_URL: "https://services.leadconnectorhq.com/hooks/fixture-only" };
  let calls = 0;
  const result = await dispatchAcademyGhl(welcome(), { env: config, fetchImpl: (async (url: string | URL, init: RequestInit) => {
    calls++; assert.equal(String(url), config.ACADEMY_GHL_WEBHOOK_URL);
    assert.equal((init.headers as Record<string, string>)["X-Academy-Event-Id"], "event-email");
    return new Response("ok");
  }) as typeof fetch });
  assert.equal(calls, 1); assert.equal(result.receipt.evidence, "webhook_accepted"); assert.equal(result.receipt.messageId, undefined);
});
