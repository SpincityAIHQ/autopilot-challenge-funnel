import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const LANDING = readFileSync(join(ROOT, "routes/index.tsx"), "utf8");
const CONFIRMED = readFileSync(join(ROOT, "routes/confirmed.tsx"), "utf8");
const CHECKOUT = readFileSync(join(ROOT, "routes/checkout.tsx"), "utf8");

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
    expect(CHECKOUT.includes("Optional $22 recordings + completed-map template add-on available inside secure Commas checkout.")).toBe(true);
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
