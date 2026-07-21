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
const VIDEO_SLOT = readFileSync(join(ROOT, "components/VideoSlot.tsx"), "utf8");
const AI_SPIN = readFileSync(join(ROOT, "components/AiSpinAvatar.tsx"), "utf8");
const OFFER_DIALOG = readFileSync(
  join(ROOT, "components/OfferExplainerDialog.tsx"),
  "utf8",
);
const CONFIG = readFileSync(join(ROOT, "lib/challenge-config.ts"), "utf8");

describe("two-day build promise", () => {
  it("promises the full build deliverables", () => {
    expect(LANDING.includes("monetizable website")).toBe(true);
    expect(LANDING.includes("launch marketing assets")).toBe(true);
    expect(LANDING.includes("lead and sales follow-up system")).toBe(true);
    expect(LANDING.includes("Your Autonomy Map")).toBe(true);
  });

  it("defines monetizable without promising income", () => {
    expect(LANDING.includes("pay, book, apply, or join your list")).toBe(true);
    expect(
      LANDING.includes("It does not mean sales or income are guaranteed"),
    ).toBe(true);
  });

  it("makes the hands-on participation requirements clear", () => {
    expect(LANDING.includes("This is a hands-on build")).toBe(true);
    expect(
      LANDING.includes("bring your logins, brand files, photos, and videos"),
    ).toBe(true);
  });

  it("shows the GA recordings option, not a fake $99 total", () => {
    expect(
      TIERS_SRC.includes(
        "Recordings are not included. Add both replays and the completed Autonomy Map template for $22 during checkout.",
      ),
    ).toBe(true);
    expect(CHECKOUT.includes("GA_BUMP_COPY")).toBe(true);
    expect(CHECKOUT.includes("$99")).toBe(false);
  });
});

describe("public video placements", () => {
  it("keeps the main VSL and sends every offer click through the explainer", () => {
    expect(
      LANDING.includes('label="Watch: what we build in 8 live hours"'),
    ).toBe(true);
    expect(LANDING.includes("OfferExplainerDialog")).toBe(true);
    expect(OFFER_DIALOG.includes("AI Spin tier guide")).toBe(true);
    expect(OFFER_DIALOG.includes('to="/checkout"')).toBe(true);
    expect(LANDING.includes('label="Day 1 preview"')).toBe(false);
    expect(LANDING.includes('label="Day 2 preview"')).toBe(false);
    expect(LANDING.includes('label="Recordings add-on preview"')).toBe(false);
  });

  it("adds offer, checkout, and tier confirmation slots without recordings video", () => {
    expect(CHECKOUT.includes("<VideoSlot")).toBe(true);
    expect(CONFIG.includes("VITE_CHALLENGE_VIDEO_CHECKOUT")).toBe(true);
    expect(CONFIG.includes("VITE_CHALLENGE_VIDEO_OFFER_GA")).toBe(true);
    expect(CONFIG.includes("VITE_CHALLENGE_VIDEO_OFFER_FOUNDER")).toBe(true);
    expect(CONFIG.includes("VITE_CHALLENGE_VIDEO_CONFIRMED_GA")).toBe(true);
    expect(CONFIG.includes("VITE_CHALLENGE_VIDEO_CONFIRMED_FOUNDER")).toBe(
      true,
    );
    expect(CONFIG.includes("VITE_CHALLENGE_VIDEO_DAY_ONE")).toBe(false);
    expect(CONFIG.includes("VITE_CHALLENGE_VIDEO_DAY_TWO")).toBe(false);
    expect(CONFIG.includes("VITE_CHALLENGE_VIDEO_GA_BUMP")).toBe(false);
  });

  it("renders no fake player when a video is missing", () => {
    expect(VIDEO_SLOT.includes("if (!safe) return null")).toBe(true);
    expect(VIDEO_SLOT.includes("Video coming soon")).toBe(false);
  });

  it("hides AI Spin until the real session and limits are verified", () => {
    expect(AI_SPIN.includes("VITE_AI_SPIN_ENABLED")).toBe(true);
    expect(AI_SPIN.includes("VITE_AI_SPIN_LIMITS_VERIFIED")).toBe(true);
    expect(AI_SPIN.includes("coming soon")).toBe(false);
  });

  it("removes the public proof placeholder", () => {
    expect(LANDING.includes("ProofPlaceholder")).toBe(false);
    expect(LANDING.includes("Receipts are being documented")).toBe(false);
  });
});

describe("confirmed page copy", () => {
  it("uses a neutral heading", () => {
    expect(CONFIRMED.includes("Thanks. We're checking your order.")).toBe(true);
    expect(CONFIRMED.includes("You're in.")).toBe(false);
  });

  it("uses real calendar paths", () => {
    expect(CONFIRMED.includes("/calendar/day1.ics")).toBe(true);
    expect(CONFIRMED.includes("/calendar/day2.ics")).toBe(true);
  });

  it("includes a what-to-bring section", () => {
    expect(CONFIRMED.includes("What to bring")).toBe(true);
  });

  it("uses the tier only for next-step guidance, never as proof of access", () => {
    expect(CONFIRMED.includes("This page alone does not unlock")).toBe(true);
    expect(
      CONFIRMED.includes(
        "Your receipt and access email are the final record of what you bought",
      ),
    ).toBe(true);
  });
});

describe("eight-hour schedule", () => {
  it("shows four live hours per day everywhere customers decide", () => {
    const landingFlat = LANDING.replace(/\s+/g, " ");
    expect(LANDING.includes("12:00–4:00 PM ET")).toBe(true);
    expect(landingFlat.includes("8 live build hours")).toBe(true);
    expect(CHECKOUT.includes("eight-hour live build")).toBe(true);
    expect(CONFIRMED.includes("12–4 PM Eastern both days")).toBe(true);
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

describe("customer-facing payment language", () => {
  it("uses FanBasis instead of the internal Commas name", () => {
    expect(LANDING.includes("secure FanBasis checkout page")).toBe(true);
    expect(CHECKOUT.includes("secure FanBasis checkout page")).toBe(true);
    expect(CONFIRMED.includes("verified webhook")).toBe(false);
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
    const soldOutIdx = LANDING.indexOf("seats.remaining <= 0");
    const salesOffIdx = LANDING.indexOf("!cfg.salesEnabled");
    expect(soldOutIdx > -1).toBe(true);
    expect(salesOffIdx > -1).toBe(true);
    expect(soldOutIdx < salesOffIdx).toBe(true);
  });
});

describe("webhook Founder-cap terminal-persistence ordering", () => {
  const WEBHOOK = readFileSync(
    join(ROOT, "routes/api/public/webhooks/commas.ts"),
    "utf8",
  );
  it("returns 500 when setTerminal fails, even on Founder-cap", () => {
    // Old bug shape (must NOT be present): `!ok && !isFounderCap` gate let
    // a Founder-cap with failed terminal update fall through to 200.
    expect(WEBHOOK.includes("!ok && !isFounderCap")).toBe(false);
    // New shape: unconditional `if (!ok) return 500` gate before Founder-cap 200.
    const okGateIdx = WEBHOOK.search(
      /if\s*\(\s*!ok\s*\)\s*\{\s*[\r\n\s]*return new Response\("Fulfillment error", \{ status: 500 \}\)/,
    );
    const founderCap200Idx = WEBHOOK.indexOf('"Founder cap"');
    expect(okGateIdx > -1).toBe(true);
    expect(founderCap200Idx > -1).toBe(true);
    expect(okGateIdx < founderCap200Idx).toBe(true);
  });
});

describe("styles.css no longer misleads about font loading", () => {
  const CSS = readFileSync(join(ROOT, "styles.css"), "utf8");
  it("no stale <link> comment", () => {
    expect(CSS.includes("Fonts loaded via <link>")).toBe(false);
  });
});
