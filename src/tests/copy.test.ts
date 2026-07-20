import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const LANDING = readFileSync(join(ROOT, "routes/index.tsx"), "utf8");
const CONFIRMED = readFileSync(join(ROOT, "routes/confirmed.tsx"), "utf8");
const CHECKOUT = readFileSync(join(ROOT, "routes/checkout.tsx"), "utf8");
const TIERS_SRC = readFileSync(join(ROOT, "lib/tiers.ts"), "utf8");

describe("landing copy corrections", () => {
  it("says 'built live with me' (not 'Ce')", () => {
    expect(LANDING.includes("built live with me")).toBe(true);
    expect(LANDING.includes("with Ce")).toBe(false);
  });

  it("removes the unapproved 'Live Q&A both days' bullet", () => {
    expect(LANDING.includes("Live Q&A both days")).toBe(false);
  });

  it("uses real calendar paths /calendar/day1.ics and /calendar/day2.ics", () => {
    expect(LANDING.includes("/calendar/day1.ics")).toBe(true);
    expect(LANDING.includes("/calendar/day2.ics")).toBe(true);
    expect(LANDING.includes("/calendar.day1.ics")).toBe(false);
    expect(LANDING.includes("/calendar.day2.ics")).toBe(false);
  });

  it("shows the GA native-bump copy, not a fake $99 total", () => {
    expect(TIERS_SRC.includes("Optional $22 recordings + completed-map template add-on available inside secure Commas checkout.")).toBe(true);
    expect(CHECKOUT.includes("GA_BUMP_COPY")).toBe(true);
    expect(CHECKOUT.includes("$99")).toBe(false);
  });
});

describe("confirmed page copy", () => {
  it("uses a neutral heading", () => {
    expect(CONFIRMED.includes("Payment confirmation pending")).toBe(true);
    expect(CONFIRMED.includes("You're in.")).toBe(false);
  });

  it("uses real calendar paths", () => {
    expect(CONFIRMED.includes("/calendar/day1.ics")).toBe(true);
    expect(CONFIRMED.includes("/calendar/day2.ics")).toBe(true);
  });

  it("includes a what-to-bring section", () => {
    expect(CONFIRMED.includes("What to bring")).toBe(true);
  });
});

describe("JSON-LD", () => {
  const ROOT_TSX = readFileSync(join(ROOT, "routes/__root.tsx"), "utf8");
  it("no longer references autopilot-challenge.example", () => {
    expect(ROOT_TSX.includes("autopilot-challenge.example")).toBe(false);
  });
  it("represents two sessions via subEvent", () => {
    expect(ROOT_TSX.includes("subEvent")).toBe(true);
  });
  it("does not load Google Fonts at runtime", () => {
    expect(ROOT_TSX.includes("fonts.googleapis.com")).toBe(false);
    expect(ROOT_TSX.includes("fonts.gstatic.com")).toBe(false);
  });
});

describe("FitCheck reconciles with recordings", () => {
  it("no longer contradicts recordings", () => {
    expect(LANDING.includes("2 hours a day, live")).toBe(false);
    expect(LANDING.includes("pure passive watching")).toBe(false);
  });
  it("mentions recordings-friendly attendance", () => {
    expect(
      LANDING.includes("live when possible, or from included recordings"),
    ).toBe(true);
  });
});

describe("Founder CTA fail-closed coverage", () => {
  it("centralizes state via useFounderCta and threads it to every Founder CTA", () => {
    expect(LANDING.includes("useFounderCta")).toBe(true);
    // TierComparison, FounderSection, FinalCta all receive founder prop
    const matches = LANDING.match(/founder=\{founder\}/g) ?? [];
    expect(matches.length >= 3).toBe(true);
  });
  it("has an 'availability unavailable' fail-closed branch", () => {
    expect(LANDING.includes("Founder availability unavailable")).toBe(true);
  });
  it("evaluates verified remaining===0 SOLD OUT BEFORE the sales-disabled fallback", () => {
    // Source-order assertion: the `seats.remaining <= 0` SOLD OUT branch must
    // appear before the `!cfg.salesEnabled` fallback so that a verified zero
    // disables every Founder CTA even when sales are off.
    const soldOutIdx = LANDING.indexOf("seats.remaining <= 0");
    const salesOffIdx = LANDING.indexOf("!cfg.salesEnabled");
    expect(soldOutIdx).toBeGreaterThan(-1);
    expect(salesOffIdx).toBeGreaterThan(-1);
    expect(soldOutIdx).toBeLessThan(salesOffIdx);
  });
});

describe("webhook Founder-cap terminal-persistence ordering", () => {
  const WEBHOOK = readFileSync(
    join(ROOT, "routes/api/public/webhooks/commas.ts"),
    "utf8",
  );
  it("returns 500 when setTerminal fails, even on Founder-cap (no !ok && !isFounderCap escape)", () => {
    // The old bug: `if (!ok && !isFounderCap) return 500` allowed a
    // Founder-cap path with a failed terminal update to fall through to 200.
    expect(WEBHOOK.includes("!ok && !isFounderCap")).toBe(false);
    // New shape: an unconditional `if (!ok) return 500;` gate precedes the
    // isFounderCap deterministic 200.
    const okGateIdx = WEBHOOK.search(/if\s*\(\s*!ok\s*\)\s*\{\s*[\r\n\s]*return new Response\("Fulfillment error", \{ status: 500 \}\)/);
    const founderCap200Idx = WEBHOOK.indexOf('"Founder cap"');
    expect(okGateIdx).toBeGreaterThan(-1);
    expect(founderCap200Idx).toBeGreaterThan(-1);
    expect(okGateIdx).toBeLessThan(founderCap200Idx);
  });
});


describe("styles.css no longer misleads about font loading", () => {
  const CSS = readFileSync(join(ROOT, "styles.css"), "utf8");
  it("no stale <link> comment", () => {
    expect(CSS.includes("Fonts loaded via <link>")).toBe(false);
  });
});
