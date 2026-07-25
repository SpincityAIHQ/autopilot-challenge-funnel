import { describe, expect, it } from "bun:test";
import { rateLimit, assertSameOrigin } from "@/lib/rate-limit";
import { isMailchimpReady } from "@/lib/mailchimp";
import { isSmsReady, isStopKeyword, isHelpKeyword } from "@/lib/sms";
import { isAiCallReady } from "@/lib/ai-call";

describe("rateLimit", () => {
  it("allows up to `limit` requests then blocks with retry-after", () => {
    const k = "test-" + Math.random();
    for (let i = 0; i < 3; i++) expect(rateLimit(k, 3, 60).ok).toBe(true);
    const blocked = rateLimit(k, 3, 60);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("assertSameOrigin — fail-closed", () => {
  it("returns FALSE when both Origin and Referer are absent (fail closed)", () => {
    // A legitimate browser fetch always sends at least one of these
    // headers on a POST; a request with neither is treated as suspicious
    // (curl, script, non-browser client) and rejected.
    expect(assertSameOrigin(new Request("http://localhost/x"))).toBe(false);
  });
  it("returns true when Origin matches Host", () => {
    const r = new Request("http://localhost/x", {
      headers: { origin: "http://localhost", host: "localhost" },
    });
    expect(assertSameOrigin(r)).toBe(true);
  });
  it("returns true when only Referer is present and its host matches", () => {
    const r = new Request("http://localhost/x", {
      headers: { referer: "http://localhost/prev", host: "localhost" },
    });
    expect(assertSameOrigin(r)).toBe(true);
  });
  it("returns false when Origin host differs from request host", () => {
    const r = new Request("http://localhost/x", {
      headers: { origin: "http://evil.com", host: "localhost" },
    });
    expect(assertSameOrigin(r)).toBe(false);
  });
});

describe("provider adapters — disabled by default", () => {
  it("mailchimp is not ready in tests", () => {
    expect(isMailchimpReady({ enabled: false })).toBe(false);
    expect(
      isMailchimpReady({
        enabled: true,
        audienceId: "a",
        apiKey: "k",
        senderEmail: "e",
        serverPrefix: "us14",
      }),
    ).toBe(true);
  });
  it("sms is not ready in tests", () => {
    expect(isSmsReady({ enabled: false })).toBe(false);
  });
  it("ai call is not ready in tests", () => {
    expect(isAiCallReady({ enabled: false })).toBe(false);
  });
});

describe("sms compliance helpers", () => {
  it("detects STOP variants case-insensitively", () => {
    expect(isStopKeyword("stop")).toBe(true);
    expect(isStopKeyword(" QUIT ")).toBe(true);
    expect(isStopKeyword("hi")).toBe(false);
  });
  it("detects HELP", () => {
    expect(isHelpKeyword("HELP")).toBe(true);
    expect(isHelpKeyword("help")).toBe(true);
    expect(isHelpKeyword("stop")).toBe(false);
  });
});
