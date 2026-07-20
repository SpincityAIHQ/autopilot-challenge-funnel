import { describe, it, expect } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { buildIcs, DAY_1, DAY_2 } from "../lib/ics";

const ROUTES_DIR = join(import.meta.dir, "..", "routes");

describe("calendar routes — real paths", () => {
  it("has files that generate /calendar/day1.ics and /calendar/day2.ics", () => {
    const names = readdirSync(ROUTES_DIR);
    // Flat file convention: `calendar.day1[.]ics.ts` -> /calendar/day1.ics
    expect(names.includes("calendar.day1[.]ics.ts")).toBe(true);
    expect(names.includes("calendar.day2[.]ics.ts")).toBe(true);
  });

  it("emits well-formed VCALENDAR content per day", () => {
    const d1 = buildIcs(DAY_1);
    const d2 = buildIcs(DAY_2);
    for (const s of [d1, d2]) {
      expect(s.startsWith("BEGIN:VCALENDAR")).toBe(true);
      expect(s.includes("TZID:America/New_York")).toBe(true);
      expect(s.trim().endsWith("END:VCALENDAR")).toBe(true);
    }
    expect(d1.includes("MAP IT")).toBe(true);
    expect(d2.includes("BUILD IT")).toBe(true);
  });
});
