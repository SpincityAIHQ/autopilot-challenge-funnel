/**
 * Week one of the Accelerator build-along: Day 1 through Day 7.
 *
 * Each entry maps to the existing build-room lesson slot
 * (`accelerator-day-01` … `accelerator-day-07`), whose recording is connected
 * server-side through `ACADEMY_VIMEO_ACCELERATOR_DAY_0N`.
 *
 * `title` and `tasks` are operator copy. Leave `tasks` empty until Spin
 * supplies the day's build steps — the card then shows a neutral "coming"
 * line instead of invented instructions.
 */
export type WeekOneDay = {
  day: number;
  lessonId: string;
  envKey: string;
  /** Public name of the day. */
  title: string;
  /** What the student builds that day. Empty until supplied. */
  tasks: string[];
};

const DAY_TITLES: Record<number, string> = {
  1: "Labor Day Launch",
};

export const WEEK_ONE: WeekOneDay[] = Array.from({ length: 7 }, (_, i) => {
  const day = i + 1;
  const n = String(day).padStart(2, "0");
  return {
    day,
    lessonId: `accelerator-day-${n}`,
    envKey: `ACCELERATOR_DAY_${n}`,
    title: DAY_TITLES[day] ?? `Day ${day}`,
    tasks: [],
  };
});
