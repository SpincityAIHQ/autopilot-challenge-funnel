import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const LANDING = readFileSync("src/routes/index.tsx", "utf8");
const FORM = readFileSync("src/components/TrainingWaitlistForm.tsx", "utf8");
const WAITLIST_API = readFileSync("src/routes/api/public/training-waitlist.ts", "utf8");
const INTEGRATIONS = readFileSync("src/lib/academy-integrations.server.ts", "utf8");

describe("free-training landing entry", () => {
  it("opens the connected lesson directly and otherwise presents the waiting list", () => {
    expect(LANDING).toContain("useCatalogue");
    expect(LANDING).toContain('connected.includes("free-webinar")');
    expect(LANDING).toContain('session.email ? "/class" : "/join"');
    expect(LANDING).toContain("trainingReady ? (");
    expect(LANDING).toContain("<TrainingWaitlistForm />");
    expect(LANDING).toContain("Start the free training");
  });

  it("keeps the name, email, and optional marketing choice accessible", () => {
    expect(FORM).toContain("<form");
    expect(FORM).toContain("onSubmit={submit}");
    expect(FORM).toContain('type="text"');
    expect(FORM).toContain('autoComplete="name"');
    expect(FORM).toContain('type="email"');
    expect(FORM).toContain('autoComplete="email"');
    expect(FORM.match(/\brequired\b/g)?.length).toBe(2);
    expect(FORM).toContain('type="checkbox"');
    expect(FORM).toContain("const [consent, setConsent] = useState(false)");
    expect(FORM).toContain("optional learning updates, Summit news and offers");
    expect(FORM).toContain('role="status"');
    expect(FORM).toContain("disabled={busy}");
  });

  it("distinguishes the requested access notice from optional ongoing marketing", () => {
    expect(FORM).toContain("Joining requests one training-access notice.");
    expect(FORM).toContain("email_marketing_consent: consent");
    expect(WAITLIST_API).toContain("email_marketing_consent: z.boolean().optional()");
    expect(WAITLIST_API).toContain("Boolean(email_marketing_consent)");
  });
});

describe("free-training waiting-list delivery", () => {
  it("protects the public endpoint and durably queues a deduplicated event", () => {
    expect(WAITLIST_API).toContain("assertSameOrigin(request)");
    expect(WAITLIST_API).toContain("consumeRateLimit(request");
    expect(WAITLIST_API).toContain("raw.length > 8 * 1024");
    expect(WAITLIST_API).toContain('name: "training_waitlist_joined"');
    expect(WAITLIST_API).toContain("dedup_key: `training-waitlist:${eventId}`");
    expect(WAITLIST_API).toContain('.from("academy_outbox").upsert');
    expect(WAITLIST_API).toContain('delivery: "queued"');
    expect(WAITLIST_API).toContain("status: 202");
  });

  it("routes the access request to GHL without implying phone or SMS consent", () => {
    expect(INTEGRATIONS).toContain('row.name === "training_waitlist_joined"');
    expect(INTEGRATIONS).toContain('purpose: "training_access_request"');
    expect(INTEGRATIONS).toContain('"X-Academy-Event-Id": row.id');
    expect(INTEGRATIONS).toContain("phone: null");
    expect(INTEGRATIONS).toContain("sms_consent: false");
    expect(INTEGRATIONS).toContain("marketing_consent: payload?.marketingConsent === true");
  });
});
