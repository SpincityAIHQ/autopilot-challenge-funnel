import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  SUMMIT_DAY_1_ISO,
  SUMMIT_DAY_1_END_ISO,
  SUMMIT_DAY_2_ISO,
  SUMMIT_DAY_2_END_ISO,
  VIP_LAB_START_ISO,
  VIP_LAB_END_ISO,
} from "../lib/challenge-config";
import { buildGoogleCalendarUrl, buildIcs, SUMMIT_DAY_1, SUMMIT_DAY_2 } from "../lib/ics";

const FILES = [
  "src/routes/index.tsx",
  "src/routes/checkout.tsx",
  "src/routes/confirmed.tsx",
  "src/routes/next-steps.tsx",
  "src/routes/offer/vip-upgrade.tsx",
  "src/lib/tiers.ts",
  "README_SETUP.md",
  ".lovable/plan.md",
  "docs/campaign-playbook.md",
  "docs/funnel-video-scripts.md",
  "docs/operator-launch-checklist.md",
]
  .filter((path) => existsSync(path))
  .map((path) => ({ path, text: readFileSync(path, "utf8") }));

describe("locked AI AutoPilot Summit schedule", () => {
  it("uses the final weekend core-session times", () => {
    expect(SUMMIT_DAY_1_ISO).toBe("2026-08-29T13:00:00-04:00");
    expect(SUMMIT_DAY_1_END_ISO).toBe("2026-08-29T16:00:00-04:00");
    expect(SUMMIT_DAY_2_ISO).toBe("2026-08-30T13:00:00-04:00");
    expect(SUMMIT_DAY_2_END_ISO).toBe("2026-08-30T16:00:00-04:00");
  });

  it("places the VIP Build Lab immediately after Day 2", () => {
    expect(VIP_LAB_START_ISO).toBe("2026-08-30T16:15:00-04:00");
    expect(VIP_LAB_END_ISO).toBe("2026-08-30T17:45:00-04:00");
  });

  it("creates timed calendar files for both main Summit days", () => {
    expect(SUMMIT_DAY_1.dateYyyyMmDd).toBe("20260829");
    expect(SUMMIT_DAY_1.startHHmm).toBe("130000");
    expect(SUMMIT_DAY_1.endHHmm).toBe("160000");
    expect(SUMMIT_DAY_2.dateYyyyMmDd).toBe("20260830");
    expect(SUMMIT_DAY_2.startHHmm).toBe("130000");
    expect(SUMMIT_DAY_2.endHHmm).toBe("160000");
  });

  it("opens real prefilled Google Calendar events in Eastern time", () => {
    const day1 = new URL(buildGoogleCalendarUrl(SUMMIT_DAY_1));
    const day2 = new URL(buildGoogleCalendarUrl(SUMMIT_DAY_2));

    for (const url of [day1, day2]) {
      expect(url.origin).toBe("https://calendar.google.com");
      expect(url.pathname).toBe("/calendar/render");
      expect(url.searchParams.get("action")).toBe("TEMPLATE");
      expect(url.searchParams.get("ctz")).toBe("America/New_York");
      expect(url.searchParams.get("location")).toContain("secure room link");
      expect(url.searchParams.get("details")).toContain("Room opens at 12:45 PM Eastern");
    }

    expect(day1.searchParams.get("dates")).toBe("20260829T130000/20260829T160000");
    expect(day2.searchParams.get("dates")).toBe("20260830T130000/20260830T160000");
  });

  it("keeps Apple and Outlook imports complete and private-link safe", () => {
    for (const event of [SUMMIT_DAY_1, SUMMIT_DAY_2]) {
      const ics = buildIcs(event);
      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("TZID:America/New_York");
      expect(ics).toContain(`LOCATION:${event.location.replace(/,/g, "\\,")}`);
      expect(ics).toContain("TRIGGER:-PT15M");
      expect(ics).not.toContain("zoom.us/");
      expect(ics).not.toContain("meet.google.com/");
    }
  });

  it("removes the rejected separate-day VIP Lab from active funnel files", () => {
    const rejected = [
      "2026-09-03T19:00:00-04:00",
      "Thursday, September 3",
      "Thu Sep 3",
      "Sep 3 at 7",
    ];

    for (const file of FILES) {
      for (const phrase of rejected) {
        if (file.text.includes(phrase)) {
          throw new Error(`${file.path} contains stale phrase: ${phrase}`);
        }
      }
    }
  });

  it("keeps the immediate live ascension window in the playbook and scripts", () => {
    const playbook = readFileSync("docs/campaign-playbook.md", "utf8");
    const scripts = readFileSync("docs/funnel-video-scripts.md", "utf8");
    expect(playbook).toContain("3:45–4:00 PM Eastern — present VIP");
    expect(playbook).toContain("4:00–4:15 PM Eastern — reset and upgrade window");
    expect(playbook).toContain("VIP Build Lab — Sunday, August 30 · 4:15–5:45 PM Eastern");
    expect(scripts).toContain("The VIP Build Lab starts at 4:15 PM Eastern");
    expect(scripts).toContain("Day 2 VIP close — 3:45 PM Eastern");
  });
});
