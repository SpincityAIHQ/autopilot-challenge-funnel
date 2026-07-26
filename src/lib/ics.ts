/**
 * .ics generator for the two Summit days.
 * Times are locked to America/New_York and include the real three-hour
 * implementation windows.
 */

const VTIMEZONE_NY = [
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "X-LIC-LOCATION:America/New_York",
  "BEGIN:DAYLIGHT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "END:STANDARD",
  "END:VTIMEZONE",
].join("\r\n");

function escapeText(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export interface IcsDay {
  uid: string;
  summary: string;
  description: string;
  dateYyyyMmDd: string;
  startHHmm: string;
  endHHmm: string;
}

export function buildIcs(day: IcsDay): string {
  const dtstamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SpincityHQ//AI AutoPilot Summit//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    VTIMEZONE_NY,
    "BEGIN:VEVENT",
    `UID:${day.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=America/New_York:${day.dateYyyyMmDd}T${day.startHHmm}`,
    `DTEND;TZID=America/New_York:${day.dateYyyyMmDd}T${day.endHHmm}`,
    `SUMMARY:${escapeText(day.summary)}`,
    `DESCRIPTION:${escapeText(day.description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(day.summary)} begins in 15 minutes`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export const SUMMIT_DAY_1: IcsDay = {
  uid: "ai-autopilot-summit-day-1-2026-08-29@spincityhq",
  summary: "AI AutoPilot Summit — Day 1: Build the Business Foundation",
  description:
    "Live online. Room opens at 12:45 PM Eastern. From 1:00–4:00 PM Eastern we choose the niche and problem, map the customer, offer and business numbers, design the business infrastructure, plan the internal app and set up the AI Business GPS. Use the secure room link in your NuAmenti email.",
  dateYyyyMmDd: "20260829",
  startHHmm: "130000",
  endHHmm: "160000",
};

export const SUMMIT_DAY_2: IcsDay = {
  uid: "ai-autopilot-summit-day-2-2026-08-30@spincityhq",
  summary: "AI AutoPilot Summit — Day 2: Hire the AI Team",
  description:
    "Live online. Room opens at 12:45 PM Eastern. From 1:00–4:00 PM Eastern we structure the AI agent team, connect workflows and improvement loops, and set up marketing, follow-up, sales and monetization. Use the secure room link in your NuAmenti email.",
  dateYyyyMmDd: "20260830",
  startHHmm: "130000",
  endHHmm: "160000",
};

// Legacy aliases kept for any older imports still in the tree.
export const DAY_1 = SUMMIT_DAY_1;
export const DAY_2 = SUMMIT_DAY_2;
