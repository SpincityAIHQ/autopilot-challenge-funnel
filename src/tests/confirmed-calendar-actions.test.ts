import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SummitCalendarActions } from "@/components/SummitCalendarActions";

const CONFIRMED = readFileSync("src/routes/confirmed.tsx", "utf8");

describe("confirmed buyer calendar actions", () => {
  it("renders real Google and Apple/Outlook destinations for both days", () => {
    const html = renderToStaticMarkup(createElement(SummitCalendarActions));

    expect(html.match(/calendar\.google\.com\/calendar\/render/g)?.length).toBe(2);
    expect(html).toContain("Add Day 1 to Google Calendar");
    expect(html).toContain("Add Day 2 to Google Calendar");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('href="/calendar/day1.ics"');
    expect(html).toContain('href="/calendar/day2.ics"');
    expect(html).toContain("Apple / Outlook (.ics)");
    expect(html).not.toContain('href="#"');
    expect(html).not.toContain("javascript:");
  });

  it("uses the calendar actions on the emailed confirmation page", () => {
    expect(CONFIRMED).toContain("SummitCalendarActions");
    expect(CONFIRMED).not.toContain(">Add Day 1 to calendar<");
    expect(CONFIRMED).not.toContain(">Add Day 2 to calendar<");
  });
});
