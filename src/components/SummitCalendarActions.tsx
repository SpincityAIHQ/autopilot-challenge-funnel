import { buildGoogleCalendarUrl, SUMMIT_DAY_1, SUMMIT_DAY_2, type IcsDay } from "@/lib/ics";

interface CalendarDay {
  shortName: string;
  dateLabel: string;
  event: IcsDay;
  icsHref: string;
}

const CALENDAR_DAYS: readonly CalendarDay[] = [
  {
    shortName: "Day 1",
    dateLabel: "Saturday, August 29 · 1:00–4:00 PM ET",
    event: SUMMIT_DAY_1,
    icsHref: "/calendar/day1.ics",
  },
  {
    shortName: "Day 2",
    dateLabel: "Sunday, August 30 · 1:00–4:00 PM ET",
    event: SUMMIT_DAY_2,
    icsHref: "/calendar/day2.ics",
  },
];

/**
 * Provider-specific calendar actions avoid the silent-download failure of a
 * generic "Add to calendar" link. Google opens a prefilled event composer;
 * Apple Calendar and Outlook receive a standard .ics import.
 */
export function SummitCalendarActions() {
  return (
    <section
      aria-labelledby="summit-calendar-heading"
      className="mt-6 rounded-md border border-[color:var(--emerald-signal)]/40 bg-[color:var(--surface)] p-5 sm:p-6"
    >
      <p className="eyebrow">Do this now</p>
      <h2 id="summit-calendar-heading" className="mt-2 font-heading text-lg text-foreground">
        Add both live Summit days to your calendar
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose your calendar below. Google opens the event already filled in; tap{" "}
        <span className="font-heading text-foreground">Save</span>. Apple Calendar and Outlook will
        import the event file.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {CALENDAR_DAYS.map((day) => (
          <article
            key={day.shortName}
            className="rounded-md border border-[color:var(--hairline)] bg-[color:var(--panel)] p-4"
          >
            <p className="font-heading text-base text-foreground">{day.shortName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{day.dateLabel}</p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={buildGoogleCalendarUrl(day.event)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-center font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Add {day.shortName} to Google Calendar
              </a>
              <a
                href={day.icsHref}
                download
                className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2.5 text-center font-heading text-sm text-foreground hover:bg-secondary"
              >
                Apple / Outlook (.ics)
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
