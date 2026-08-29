import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { CONSENT_COPY, CONSENT_COPY_VERSION, SELLER_IDENTITY } from "@/lib/consent";

const endpointSrc = readFileSync("src/routes/api/public/communication-preferences.ts", "utf8");
const pageSrc = readFileSync("src/routes/communication-preferences.tsx", "utf8");

describe("consent copy + seller identity", () => {
  it("uses the versioned copy string requested in the punch-list", () => {
    expect(CONSENT_COPY_VERSION).toBe("2026-08-29-v2");
  });
  it("brands as SpincityHQ LLC / NuAmenti (no unverified DBA)", () => {
    expect(SELLER_IDENTITY).toBe("SpincityHQ LLC / NuAmenti");
    for (const ch of ["email", "sms", "ai_call"] as const) {
      expect(CONSENT_COPY[ch].includes(SELLER_IDENTITY)).toBe(true);
      expect(CONSENT_COPY[ch].toLowerCase().includes("dba")).toBe(false);
    }
  });
  it("uses specific automated-marketing disclosures for SMS and AI calls", () => {
    const sms = CONSENT_COPY.sms.toLowerCase();
    for (const phrase of [
      "recurring automated marketing and promotional text messages",
      "summit and related offers",
      "phone number i provide",
      "message frequency may vary",
      "consent is not required to purchase",
      "message and data rates may apply",
      "reply stop",
      "help for help",
    ]) {
      expect(sms).toContain(phrase);
    }

    const aiCall = CONSENT_COPY.ai_call.toLowerCase();
    for (const phrase of [
      "automated marketing and promotional calls",
      "summit and related offers",
      "phone number i provide",
      "ai-generated or artificial voice",
      "prerecorded voice",
      "not a condition of purchase",
      "revoke it at any time",
    ]) {
      expect(aiCall).toContain(phrase);
    }
  });
});

describe("communication-preferences endpoint — server-derived identity", () => {
  it("does not accept an email field from the client body", () => {
    // Schema must not list `email` and must not read subjectEmail from body.
    expect(
      endpointSrc.match(/email:\s*z\.string\(\)\s*\.trim\(\)\s*\.toLowerCase\(\)\.email/),
    ).toBeNull();
    expect(endpointSrc.match(/body\.email/)).toBeNull();
  });
  it("derives the subject from the HttpOnly session cookie", () => {
    expect(endpointSrc.includes("getCookie(SESSION_COOKIE)")).toBe(true);
    expect(endpointSrc.includes("session_active_scopes")).toBe(true);
    expect(endpointSrc.includes("subjectEmail")).toBe(true);
  });
  it("returns 401 when no session is present (no silent proceed)", () => {
    expect(
      endpointSrc.includes('return respond(401, JSON.stringify({ error: "session_required" })'),
    ).toBe(true);
  });
  it("requires a typed signer name when the AI-call box is checked", () => {
    expect(endpointSrc.includes("if (channels.ai_call && !signer)")).toBe(true);
    expect(endpointSrc.includes("signature_required")).toBe(true);
  });
  it("persists full evidence (consent_text, seller, source_route, hashes)", () => {
    for (const field of [
      "consent_text: CONSENT_COPY[ch]",
      "seller: SELLER_IDENTITY",
      "source_route: routeClean",
      'source: "communication-preferences"',
      "request_hash: requestHash",
      "user_agent_hash: userAgentHash",
      "copy_version: CONSENT_COPY_VERSION",
    ]) {
      expect(endpointSrc.includes(field)).toBe(true);
    }
  });
  it("does not truncate consent_text into the source column", () => {
    expect(endpointSrc.match(/CONSENT_COPY\[ch\]\.slice\(/)).toBeNull();
  });
  it("computes request/user-agent hashes with the rate-limit HMAC secret", () => {
    expect(endpointSrc.includes('createHmac("sha256", secret)')).toBe(true);
    expect(endpointSrc.includes("hmacOf(rlSecret")).toBe(true);
  });
});

describe("communication-preferences page — session-gated UI", () => {
  it("does not render a typed-email input", () => {
    expect(pageSrc.match(/type="email"/)).toBeNull();
    expect(pageSrc.match(/setEmail\(/)).toBeNull();
  });
  it("checks entitlement-summary before rendering the form", () => {
    expect(pageSrc.includes('"/api/public/resources/entitlement-summary"')).toBe(true);
  });
  it("shows a warm secure-link/resend instruction when unauthenticated", () => {
    expect(pageSrc.includes("You’ll need your secure link first.")).toBe(true);
    expect(pageSrc.includes("Sebastian@spincityhq.com")).toBe(true);
  });
  it("collects a typed e-signature when AI-call is checked", () => {
    expect(pageSrc.includes("Typed e-signature")).toBe(true);
    expect(pageSrc.includes("signerName")).toBe(true);
  });
  it("keeps every marketing box unchecked by default", () => {
    expect(pageSrc.includes("useState(false)")).toBe(true);
    // No defaulted-true booleans on the marketing checkboxes.
    expect(pageSrc.match(/useState<boolean>\(true\)/)).toBeNull();
  });
});

describe("release:check script + canonical route scan", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const scan = readFileSync("scripts/scan-assets.sh", "utf8");

  it("exposes test, typecheck, verify:assets, and release:check scripts", () => {
    for (const s of ["test", "typecheck", "verify:assets", "release:check"]) {
      expect(typeof pkg.scripts[s]).toBe("string");
      expect(pkg.scripts[s].length).toBeGreaterThan(0);
    }
    // release:check must chain the four required gates.
    expect(pkg.scripts["release:check"].includes("typecheck")).toBe(true);
    expect(pkg.scripts["release:check"].includes("test")).toBe(true);
    expect(pkg.scripts["release:check"].includes("build")).toBe(true);
    expect(pkg.scripts["release:check"].includes("verify:assets")).toBe(true);
  });

  it("scans the six canonical funnel route files (no legacy redirect aliases)", () => {
    for (const r of [
      "src/routes/offer/vip-upgrade.tsx",
      "src/routes/offer/implementation-vault.tsx",
      "src/routes/next-keynote.tsx",
      "src/routes/next-steps.tsx",
      "src/routes/apply.mentorship.tsx",
      "src/routes/strategy-intensive.tsx",
    ]) {
      expect(scan.includes(r)).toBe(true);
    }
    // Legacy redirect aliases must not be used as substitutes.
    expect(scan.match(/"src\/routes\/offer\/keynote\.tsx"/)).toBeNull();
    expect(scan.match(/"src\/routes\/offer\/mentorship\.tsx"/)).toBeNull();
  });
});
