import { describe, expect, it } from "bun:test";
import {
  academyEmailTransport,
  nativeEmailEnabled,
  nativeEmailIdempotencyKey,
  nativeEmailPurpose,
  nativeEmailReady,
  nativeEmailTemplate,
  NATIVE_EMAIL_HELD_EVENTS,
} from "@/lib/academy-email-transport";
import { dispatchAcademyNativeEmail } from "@/lib/academy-native-email.server";

const ready = {
  ACADEMY_MESSAGE_TRANSPORT: "lovable",
  ACADEMY_NATIVE_EMAIL_ENABLED: "true",
  LOVABLE_API_KEY: "synthetic-key",
} as Record<string, string | undefined>;

const base = {
  event_id: "evt-1",
  event_name: "webinar_registered",
  email: "learner@example.com",
  send_email: true,
  send_sms: false,
  marketing_consent: false,
  message_subject: "Your account is ready",
  message_text: "Welcome.\n\nOpen the classroom.",
  action_label: "Open",
  action_url: "https://aiautopilotsummit.com/class",
};

const sender = (result: any, calls: any[] = []) => {
  const impl = async (template: string, to: string, options: any) => {
    options.onAttempt?.();
    if (options.beforeSend && !(await options.beforeSend())) {
      return { sent: false, reason: "cancelled_before_send" };
    }
    calls.push({ template, to, options });
    if (result instanceof Error) throw result;
    return result;
  };
  return { impl, calls };
};

describe("transport selection", () => {
  it("defaults to lovable and fails closed on unknown values", () => {
    expect(academyEmailTransport({})).toBe("lovable");
    expect(academyEmailTransport({ ACADEMY_MESSAGE_TRANSPORT: "ghl" })).toBe("ghl");
    expect(academyEmailTransport({ ACADEMY_MESSAGE_TRANSPORT: "off" })).toBe("off");
    expect(academyEmailTransport({ ACADEMY_MESSAGE_TRANSPORT: "sendgrid" })).toBe("off");
  });

  it("keeps the explicit send gate off by default", () => {
    expect(nativeEmailEnabled({})).toBe(false);
    expect(nativeEmailReady({ ACADEMY_MESSAGE_TRANSPORT: "lovable", LOVABLE_API_KEY: "k" })).toBe(false);
    expect(nativeEmailReady(ready)).toBe(true);
    expect(nativeEmailReady({ ...ready, LOVABLE_API_KEY: undefined })).toBe(false);
    expect(nativeEmailReady({ ...ready, ACADEMY_MESSAGE_TRANSPORT: "ghl" })).toBe(false);
    expect(nativeEmailReady({ ...ready, ACADEMY_MESSAGE_TRANSPORT: "off" })).toBe(false);
  });

  it("maps events deliberately and holds unauthored ones", () => {
    expect(nativeEmailTemplate("webinar_registered")).toBe("academy-account-welcome");
    expect(nativeEmailTemplate("purchase_access_code")).toBe("academy-purchase-access-code");
    expect(nativeEmailTemplate("access_activated")).toBe("academy-access-activated");
    expect(nativeEmailTemplate("webinar_not_started")).toBe("academy-never-started");
    expect(nativeEmailTemplate("learning_dropoff")).toBe("academy-learning-inactivity");
    for (const held of NATIVE_EMAIL_HELD_EVENTS) expect(nativeEmailTemplate(held)).toBeNull();
  });

  it("documents purpose per event and uses stable idempotency keys", () => {
    expect(nativeEmailPurpose("access_activated")).toBe("transactional");
    expect(nativeEmailPurpose("purchase_access_code")).toBe("transactional");
    expect(nativeEmailPurpose("learning_dropoff")).toBe("marketing");
    expect(nativeEmailIdempotencyKey("evt-1", "webinar_registered")).toBe("webinar_registered:email:evt-1");
    expect(nativeEmailIdempotencyKey("evt-1", "webinar_registered")).toBe(
      nativeEmailIdempotencyKey("evt-1", "webinar_registered"),
    );
  });
});

describe("native dispatch", () => {
  it("refuses without an attempt when native email is not enabled", async () => {
    const { impl, calls } = sender({ sent: true });
    await expect(dispatchAcademyNativeEmail(base, { env: {}, sendImpl: impl })).rejects.toThrow(
      "NATIVE_EMAIL_NOT_ENABLED",
    );
    expect(calls.length).toBe(0);
  });

  it("accepts a transactional send without any GoHighLevel configuration", async () => {
    const { impl, calls } = sender({ sent: true });
    const out = await dispatchAcademyNativeEmail(base, { env: ready, sendImpl: impl });
    expect(out.status).toBe("accepted");
    expect(out.receipt.evidence).toBe("provider_accepted");
    expect(calls[0].template).toBe("academy-account-welcome");
    expect(calls[0].options.purpose).toBe("transactional");
    expect(calls[0].options.idempotencyKey).toBe("webinar_registered:email:evt-1");
  });

  it("sends optional learning email as marketing and requires consent", async () => {
    const consented = { ...base, event_name: "learning_dropoff", marketing_consent: true };
    const { impl, calls } = sender({ sent: true });
    const out = await dispatchAcademyNativeEmail(consented, { env: ready, sendImpl: impl });
    expect(out.status).toBe("accepted");
    expect(calls[0].options.purpose).toBe("marketing");

    const denied = await dispatchAcademyNativeEmail(
      { ...consented, marketing_consent: false },
      { env: ready, sendImpl: sender({ sent: true }).impl },
    );
    expect(denied.status).toBe("cancelled");
  });

  it("never sends SMS or CRM-only events as native email", async () => {
    for (const name of ["webinar_registered_sms", "customer_returned"]) {
      const { impl, calls } = sender({ sent: true });
      const out = await dispatchAcademyNativeEmail({ ...base, event_name: name }, { env: ready, sendImpl: impl });
      expect(out.status).toBe("cancelled");
      expect(calls.length).toBe(0);
    }
  });

  it("holds unauthored events instead of guessing a template", async () => {
    const out = await dispatchAcademyNativeEmail(
      { ...base, event_name: "learning_practice" },
      { env: ready, sendImpl: sender({ sent: true }).impl },
    );
    expect(out.status).toBe("cancelled");
    expect(out.receipt.reason).toBe("template_not_authored");
  });

  it("requires a verified purchase for code and activation email", async () => {
    for (const name of ["purchase_access_code", "access_activated"]) {
      const blocked = await dispatchAcademyNativeEmail(
        { ...base, event_name: name },
        { env: ready, sendImpl: sender({ sent: true }).impl },
      );
      expect(blocked.status).toBe("cancelled");
      const allowed = await dispatchAcademyNativeEmail(
        { ...base, event_name: name, purchase_verified: true },
        { env: ready, sendImpl: sender({ sent: true }).impl },
      );
      expect(allowed.status).toBe("accepted");
    }
  });

  it("maps provider suppression to cancelled, not failed", async () => {
    const out = await dispatchAcademyNativeEmail(base, {
      env: ready,
      sendImpl: sender({ sent: false, reason: "recipient_suppressed" }).impl,
    });
    expect(out.status).toBe("cancelled");
    expect(out.receipt.reason).toBe("recipient_suppressed");
  });

  it("cancels without sending when late eligibility fails after rendering", async () => {
    const { impl, calls } = sender({ sent: true });
    const out = await dispatchAcademyNativeEmail(base, {
      env: ready,
      sendImpl: impl,
      beforeSend: async () => false,
    });
    expect(out.status).toBe("cancelled");
    expect(out.receipt.reason).toBe("cancelled_before_send");
    expect(calls.length).toBe(0);
  });

  it("returns unknown for an ambiguous outcome after the request was made", async () => {
    const out = await dispatchAcademyNativeEmail(base, {
      env: ready,
      sendImpl: sender(new Error("socket hang up")).impl,
    });
    expect(out.status).toBe("unknown");
    expect(out.receipt.evidence).toBe("outcome_unknown");
  });

  it("counts one attempt exactly once", async () => {
    let attempts = 0;
    await dispatchAcademyNativeEmail(base, {
      env: ready,
      sendImpl: sender({ sent: true }).impl,
      onAttempt: () => { attempts++; },
    });
    expect(attempts).toBe(1);
  });
});
