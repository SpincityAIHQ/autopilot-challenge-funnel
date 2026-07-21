/**
 * .ics generator for the two live days. Times are in America/New_York.
 * We emit a VTIMEZONE block plus local DTSTART/DTEND with TZID.
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
  dateYyyyMmDd: string; // e.g. "20260801"
  startHHmm: string; // "120000"
  endHHmm: string; // "140000"
}

export function buildIcs(day: IcsDay): string {
  const dtstamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SpincityHQ//AUTOPILOT Challenge//EN",
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
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export const DAY_1: IcsDay = {
  uid: "autopilot-challenge-day-1-2026-08-01@spincityhq",
  summary: "AUTOPILOT Challenge — Day 1: BUILD THE OFFER + SITE",
  description:
    "Build the offer and monetizable site. Add the brand, sales message, media, and a way to pay, book, or become a lead. 12:00–2:00 PM ET.",
  dateYyyyMmDd: "20260801",
  startHHmm: "120000",
  endHHmm: "140000",
};

export const DAY_2: IcsDay = {
  uid: "autopilot-challenge-day-2-2026-08-02@spincityhq",
  summary: "AUTOPILOT Challenge — Day 2: BUILD THE MARKETING + AUTOPILOT",
  description:
    "Build the marketing assets, lead and sales follow-up system, AI rules, and test the full path before launch. 12:00–2:00 PM ET.",
  dateYyyyMmDd: "20260802",
  startHHmm: "120000",
  endHHmm: "140000",
};
