/**
 * .ics generator for the two Summit days.
 * Times are in America/New_York. Exact start/end times are operator-
 * configured; until set, calendars use all-day event blocks so no
 * misleading clock time ships publicly.
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
  dateYyyyMmDd: string; // "20260824"
  /** Optional local times. If omitted, an all-day event is emitted. */
  startHHmm?: string;
  endHHmm?: string;
}

function nextDay(dateYyyyMmDd: string): string {
  const y = Number(dateYyyyMmDd.slice(0, 4));
  const m = Number(dateYyyyMmDd.slice(4, 6));
  const d = Number(dateYyyyMmDd.slice(6, 8));
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  const yy = dt.getUTCFullYear().toString().padStart(4, "0");
  const mm = (dt.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = dt.getUTCDate().toString().padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function buildIcs(day: IcsDay): string {
  const dtstamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const useTimed = Boolean(day.startHHmm && day.endHHmm);
  const timeLines = useTimed
    ? [
        `DTSTART;TZID=America/New_York:${day.dateYyyyMmDd}T${day.startHHmm}`,
        `DTEND;TZID=America/New_York:${day.dateYyyyMmDd}T${day.endHHmm}`,
      ]
    : [
        `DTSTART;VALUE=DATE:${day.dateYyyyMmDd}`,
        `DTEND;VALUE=DATE:${nextDay(day.dateYyyyMmDd)}`,
      ];
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
    ...timeLines,
    `SUMMARY:${escapeText(day.summary)}`,
    `DESCRIPTION:${escapeText(day.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export const SUMMIT_DAY_1: IcsDay = {
  uid: "ai-autopilot-summit-day-1-2026-08-24@spincityhq",
  summary: "AI AutoPilot Summit — Day 1: MAP IT",
  description:
    "Live online. Map your AI-powered revenue and operating system. Session start time is sent to registrants by email.",
  dateYyyyMmDd: "20260824",
};

export const SUMMIT_DAY_2: IcsDay = {
  uid: "ai-autopilot-summit-day-2-2026-08-25@spincityhq",
  summary: "AI AutoPilot Summit — Day 2: BUILD IT",
  description:
    "Live online. Build the AI-powered workflows that move leads, offers, and delivery. Session start time is sent to registrants by email.",
  dateYyyyMmDd: "20260825",
};

// Legacy aliases kept for any older imports still in the tree.
export const DAY_1 = SUMMIT_DAY_1;
export const DAY_2 = SUMMIT_DAY_2;
