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

const PLAN: Record<number, { title: string; tasks: string[] }> = {
  1: {
    title: "Labor Day Launch",
    tasks: [
      "Watch the launch video all the way through.",
      "Write down the one offer you are building the system around.",
      "List the three tasks that eat the most of your week.",
    ],
  },
  2: {
    title: "Diagnose the bottleneck",
    tasks: [
      "Map your current delivery from first contact to payment.",
      "Mark the step where work stalls the most.",
      "Turn that step into one clear job description for an agent.",
    ],
  },
  3: {
    title: "Stabilize the basics",
    tasks: [
      "Write the standard way that job should be done, in plain steps.",
      "Collect the templates, links and answers the job needs.",
      "Put them in one folder your AI can be pointed at.",
    ],
  },
  4: {
    title: "Build your company brain",
    tasks: [
      "Load your offer, voice and standard steps into one project brief.",
      "Ask it to answer three real questions from your week.",
      "Correct the answers and save the corrections back into the brief.",
    ],
  },
  5: {
    title: "Instrument the numbers",
    tasks: [
      "Pick the three numbers that tell you the business is working.",
      "Decide where each number is recorded and how often.",
      "Set one weekly check you will actually keep.",
    ],
  },
  6: {
    title: "Coordinate follow-up",
    tasks: [
      "Draft the follow-up sequence for a new lead.",
      "Hand the drafting to your agent and keep approval with you.",
      "Test it end to end with your own email or phone.",
    ],
  },
  7: {
    title: "Automate and review",
    tasks: [
      "Turn on the one automation you trust most.",
      "Write what should happen when it gets something wrong.",
      "Post your week-one result in the build room.",
    ],
  },
};

export const WEEK_ONE: WeekOneDay[] = Array.from({ length: 7 }, (_, i) => {
  const day = i + 1;
  const n = String(day).padStart(2, "0");
  const plan = PLAN[day];
  return {
    day,
    lessonId: `accelerator-day-${n}`,
    envKey: `ACCELERATOR_DAY_${n}`,
    title: plan?.title ?? `Day ${day}`,
    tasks: plan?.tasks ?? [],
  };
});
