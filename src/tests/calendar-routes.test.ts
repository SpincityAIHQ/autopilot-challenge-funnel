import { describe, it, expect } from "bun:test";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIcs, DAY_1, DAY_2, DAY_1_VIP, DAY_2_VIP } from "../lib/ics";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = join(HERE, "..", "routes");

describe("calendar routes — real paths", () => {
  it("has files that generate /calendar/day1.ics and /calendar/day2.ics", () => {
    const names = readdirSync(ROUTES_DIR);
    // Flat file convention: `calendar.day1[.]ics.ts` -> /calendar/day1.ics
    expect(names.includes("calendar.day1[.]ics.ts")).toBe(true);
    expect(names.includes("calendar.day2[.]ics.ts")).toBe(true);
    expect(names.includes("calendar.day1-vip[.]ics.ts")).toBe(true);
    expect(names.includes("calendar.day2-vip[.]ics.ts")).toBe(true);
  });

  it("emits well-formed VCALENDAR content per day", () => {
    const d1 = buildIcs(DAY_1);
    const d2 = buildIcs(DAY_2);
    for (const s of [d1, d2]) {
      expect(s.startsWith("BEGIN:VCALENDAR")).toBe(true);
      expect(s.includes("TZID:America/New_York")).toBe(true);
      expect(s.trim().endsWith("END:VCALENDAR")).toBe(true);
    }
    expect(d1.includes("BUILD THE OFFER + SITE")).toBe(true);
    expect(d2.includes("BUILD THE MARKETING + AUTOPILOT")).toBe(true);
  });

  it("blocks four core hours and adds the VIP hour only for VIP+", () => {
    const d1 = buildIcs(DAY_1);
    const d2 = buildIcs(DAY_2);
    const v1 = buildIcs(DAY_1_VIP);
    const v2 = buildIcs(DAY_2_VIP);
    expect(d1.includes("T120000")).toBe(true);
    expect(d1.includes("T160000")).toBe(true);
    expect(d2.includes("T160000")).toBe(true);
    expect(v1.includes("T170000")).toBe(true);
    expect(v2.includes("T170000")).toBe(true);
    expect(v1.includes("personal turn is not guaranteed")).toBe(true);
  });
});
