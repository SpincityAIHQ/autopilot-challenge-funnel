/** Public catalogue only. Paid lesson text, answer keys and media stay server-side. */
export type AcademyTier = "free" | "ga" | "vip" | "vault" | "accelerator";
export type LessonKind = "lesson" | "session";
export type LessonMeta = {
  id: string;
  title: string;
  stage: string;
  tier: AcademyTier;
  summary: string;
  skill: string;
  /** `lesson` has notes, a knowledge check and an activity book. `session` is a tracked replay. */
  kind: LessonKind;
  /** Server environment key suffix for this slot's Vimeo URL and chapters. */
  envKey: string;
};
/** Number of Accelerator build-room days that receive a Vimeo slot. Adjust in one place. */
export const ACCELERATOR_DAY_COUNT = 12;
export function envKeyFor(id: string) {
  return id.replace(/-/g, "_").toUpperCase();
}
const CORE: Omit<LessonMeta, "kind" | "envKey">[] = [
  {
    id: "free-webinar",
    title: "Your business, cleared for takeoff",
    stage: "Free training",
    tier: "free",
    summary: "Find one business bottleneck and design the first job your AI team should handle.",
    skill: "Define a useful automation",
  },
  {
    id: "business-before-ai",
    title: "Build the business before you automate it",
    stage: "Summit · Day 1",
    tier: "ga",
    summary: "Capture founder knowledge. Define the customer, offer and process.",
    skill: "Diagnose the business",
  },
  {
    id: "hire-the-ai-team",
    title: "Hire the AI team",
    stage: "Summit · Day 2",
    tier: "ga",
    summary: "Give each agent a bounded job, an owner and a completion receipt.",
    skill: "Design an accountable workflow",
  },
  {
    id: "coordinate-the-business",
    title: "Coordinate the whole business",
    stage: "VIP · After hours 1",
    tier: "vip",
    summary: "Make separate teams work from the same business context.",
    skill: "Coordinate handoffs",
  },
  {
    id: "measure-the-system",
    title: "The money and the structure",
    stage: "VIP · After hours 2",
    tier: "vip",
    summary: "Separate activity from value and test the economics of a workflow.",
    skill: "Measure results",
  },
  {
    id: "own-the-platform",
    title: "Own your operating system",
    stage: "Emerald · Intensive",
    tier: "vault",
    summary: "Map account ownership, access, operating costs and recovery.",
    skill: "Operate responsibly",
  },
  {
    id: "implementation-lab",
    title: "Build, test, improve",
    stage: "Accelerator · Lab",
    tier: "accelerator",
    summary: "Take one workflow from a job card to a tested operating routine.",
    skill: "Demonstrate a working system",
  },
];
export const ACCELERATOR_DAYS: LessonMeta[] = Array.from(
  { length: ACCELERATOR_DAY_COUNT },
  (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    const id = `accelerator-day-${n}`;
    return {
      id,
      title: `Build room · Day ${n}`,
      stage: `Accelerator · Day ${n}`,
      tier: "accelerator" as const,
      summary: "Replay of the live implementation session. Use AI Spin to find the part you need.",
      skill: "Implement with the group",
      kind: "session" as const,
      envKey: envKeyFor(id),
    };
  },
);
export const LESSONS: LessonMeta[] = [
  ...CORE.map((l) => ({ ...l, kind: "lesson" as const, envKey: envKeyFor(l.id) })),
  ...ACCELERATOR_DAYS,
];
export function lessonHref(id: string) {
  return id === "free-webinar" ? "/class" : `/lesson/${id}`;
}
export const SUMMIT_OFFERS = [
  {
    tier: "ga",
    name: "General Admission",
    price: 22,
    label: "The foundation",
    includes: "Day 1 Main + Day 2 Main recordings",
    url: "https://spincityhq.com/products/ai-autopilot-summit-general-admission",
  },
  {
    tier: "vip",
    name: "Summit + VIP",
    price: 99,
    label: "Go deeper",
    includes: "General Admission + both VIP after-hours recordings",
    url: "https://spincityhq.com/products/ai-autopilot-summit-vip",
  },
  {
    tier: "vault",
    name: "Emerald Vault Key",
    price: 298,
    label: "The complete Summit",
    includes: "VIP + Day 3 Emerald intensive + the Vault: skills, prompts, plug-ins and templates",
    url: "https://spincityhq.com/products/ai-autopilot-summit-vip-emerald-vault-key",
  },
] as const;
export const ACCELERATOR_OFFER = {
  tier: "accelerator",
  name: "Autopilot Accelerator",
  price: 4000,
  label: "Guided implementation",
  includes:
    "September–December 2026 group build rooms, every day's replay, live AI Spin avatar and 1-on-1 time with SpinCity",
  url: "https://spincityhq.com/products/q4-ai-accelerator",
} as const;
export const COMMUNITY_URL =
  "https://www.skool.com/the-ascended-masters/about?ref=ce11d00bd3994b97bfd25e10976d9f0b";

/** The "ticket" a student holds: their Summit tier plus whether Accelerator is active. */
export type Ticket = {
  summit: "free" | "ga" | "vip" | "vault";
  accelerator: boolean;
  label: string;
  code: string;
};
const SUMMIT_LABELS = {
  free: "Free Training",
  ga: "General Admission",
  vip: "Summit + VIP",
  vault: "Emerald Vault Key",
} as const;
export function ticketFor(grants: string[]): Ticket {
  const rank: Record<string, number> = { ga: 1, vip: 2, vault: 3 };
  let summit: Ticket["summit"] = "free";
  for (const g of grants) if ((rank[g] ?? 0) > (rank[summit] ?? 0)) summit = g as Ticket["summit"];
  const accelerator = grants.includes("accelerator");
  const parts = [accelerator ? "Autopilot Accelerator" : null, SUMMIT_LABELS[summit]].filter(
    Boolean,
  ) as string[];
  const label = accelerator && summit === "free" ? "Autopilot Accelerator" : parts.join(" + ");
  return {
    summit,
    accelerator,
    label,
    code: `${accelerator ? "ACC" : "SMT"}-${summit.toUpperCase()}`,
  };
}
export type Offer = {
  tier: AcademyTier;
  name: string;
  price: number;
  label: string;
  includes: string;
  url: string;
};
/** The next stage worth inviting a student into. Null when they already hold everything. */
export function nextOffer(ticket: Ticket): Offer | null {
  const order = ["ga", "vip", "vault"] as const;
  const idx = order.indexOf(ticket.summit as (typeof order)[number]);
  const nextSummit = order[idx + 1];
  if (nextSummit) return SUMMIT_OFFERS.find((o) => o.tier === nextSummit) as Offer;
  if (!ticket.accelerator) return ACCELERATOR_OFFER;
  return null;
}
export type Interval = [number, number];
/** Union coverage: repeated viewing and seeking never inflate watched duration. */
export function mergeIntervals(ranges: Interval[], duration: number): Interval[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const clean = ranges
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
    .map(([a, b]): Interval => [Math.max(0, a), Math.min(duration, b)])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [];
  for (const [a, b] of clean) {
    const last = merged.at(-1);
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  return merged;
}
export function coverage(ranges: Interval[], duration: number): number {
  return duration > 0
    ? Math.round(
        (100 * mergeIntervals(ranges, duration).reduce((n, [a, b]) => n + b - a, 0)) / duration,
      )
    : 0;
}
/** The Vault opens for Emerald Vault Key holders and Accelerator students. */
export function vaultAllows(grants: string[]) {
  return grants.includes("vault") || grants.includes("accelerator");
}
export function tierAllows(grants: string[], tier: AcademyTier) {
  if (tier === "free") return true;
  if (tier === "accelerator") return grants.includes("accelerator");
  const rank: Record<string, number> = { ga: 1, vip: 2, vault: 3 };
  return grants.some((g) => (rank[g] ?? 0) >= rank[tier]);
}
export type Chapter = { start: number; title: string };
export type LessonMedia = {
  url: string;
  version: string;
  duration: number;
  captions: string | null;
  /** `vimeo` plays through the Vimeo player API; `file` plays a signed HTTPS recording. */
  provider: "vimeo" | "file";
  chapters: Chapter[];
  /** False when the duration could not be confirmed server-side and comes from the player. */
  durationVerified: boolean;
};
export type LessonProgress = {
  lesson_id: string;
  media_version: string;
  intervals: Interval[];
  duration: number;
  position: number;
  quiz_score: number | null;
  quiz_total: number | null;
  workbook: Record<string, string>;
  workbook_status: string;
  reviewer_feedback: string | null;
  updated_at: string;
};
export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
    : `${m}:${String(r).padStart(2, "0")}`;
}
/**
 * Parse "0|Intro;312|Job cards" or "0=Intro;5:12=Job cards" into ordered chapters.
 * Accepts seconds or m:ss / h:mm:ss. Invalid entries are dropped, never invented.
 */
export function parseChapters(raw: string | undefined | null, duration = Infinity): Chapter[] {
  if (!raw) return [];
  const out: Chapter[] = [];
  for (const part of raw.split(/[;\n]/)) {
    const m = part.trim().match(/^([0-9:]+)\s*[|=]\s*(.+)$/);
    if (!m) continue;
    const pieces = m[1].split(":").map(Number);
    if (pieces.some((n) => !Number.isFinite(n))) continue;
    const start = pieces.reduce((acc, n) => acc * 60 + n, 0);
    if (start < 0 || start >= duration) continue;
    out.push({ start, title: m[2].trim().slice(0, 120) });
  }
  return out
    .sort((a, b) => a.start - b.start)
    .filter((c, i, arr) => i === 0 || c.start > arr[i - 1].start);
}
export type ChapterStatus = Chapter & {
  end: number;
  watched: number;
  status: "watched" | "partial" | "missed";
};
/** Per-chapter coverage so AI Spin and the watch map can name the exact part a student missed. */
export function chapterStatus(
  chapters: Chapter[],
  intervals: Interval[],
  duration: number,
): ChapterStatus[] {
  if (!duration || !chapters.length) return [];
  const merged = mergeIntervals(intervals, duration);
  return chapters.map((c, i) => {
    const end = chapters[i + 1]?.start ?? duration;
    const span = Math.max(0, end - c.start);
    let covered = 0;
    for (const [a, b] of merged) covered += Math.max(0, Math.min(b, end) - Math.max(a, c.start));
    const watched = span > 0 ? Math.round((100 * covered) / span) : 0;
    return {
      ...c,
      end,
      watched,
      status: (watched >= 85
        ? "watched"
        : watched >= 15
          ? "partial"
          : "missed") as ChapterStatus["status"],
    };
  });
}
export type WatchSummary = {
  coverage: number;
  furthest: number;
  /** Where the student last stopped, when the recording is not effectively complete. */
  dropOffAt: number | null;
  /** Unwatched spans longer than 30 seconds. */
  gaps: Interval[];
  minutesWatched: number;
};
export function watchSummary(
  p?: Pick<LessonProgress, "intervals" | "duration" | "position">,
): WatchSummary {
  if (!p || !p.duration)
    return { coverage: 0, furthest: 0, dropOffAt: null, gaps: [], minutesWatched: 0 };
  const merged = mergeIntervals(p.intervals, p.duration);
  const watched = merged.reduce((n, [a, b]) => n + b - a, 0);
  const pct = Math.round((100 * watched) / p.duration);
  const furthest = merged.at(-1)?.[1] ?? 0;
  const gaps: Interval[] = [];
  let cursor = 0;
  for (const [a, b] of merged) {
    if (a - cursor >= 30) gaps.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (p.duration - cursor >= 30) gaps.push([cursor, p.duration]);
  return {
    coverage: pct,
    furthest,
    dropOffAt: pct >= 90 ? null : Math.min(p.duration, Math.max(p.position, 0)),
    gaps,
    minutesWatched: Math.round(watched / 60),
  };
}
export function nextStep(p?: LessonProgress, kind: LessonKind = "lesson") {
  if (kind === "session") {
    const w = watchSummary(p);
    if (!p || !p.duration) return "Press play on this replay when you have 20 focused minutes.";
    if (w.coverage < 90)
      return `You stopped at ${formatTime(w.dropOffAt ?? 0)}. Pick up there and finish the session.`;
    return "You finished this session. Apply one thing from it in the implementation lab.";
  }
  if (!p) return "Start the lesson and identify one real business problem.";
  if (p.quiz_score === null) return "Try the knowledge check to find what needs practice.";
  if (p.quiz_score < (p.quiz_total ?? 1))
    return "Review the feedback, then try the knowledge check again.";
  if (p.workbook_status === "draft")
    return "Apply the lesson to your business in the activity book.";
  if (p.workbook_status === "submitted")
    return "Your activity is ready for instructor review. Practise the workflow while you wait.";
  if (p.workbook_status === "needs_revision")
    return "Use the instructor feedback to revise your activity.";
  return "You demonstrated this skill. Revisit it with a new example in a week.";
}
export type LessonContent = {
  id: string;
  version: string;
  paragraphs: { heading: string; text: string }[];
  questions: { id: string; prompt: string; choices: string[] }[];
  workbook: { id: string; label: string; hint: string }[];
  media: LessonMedia | null;
  /** Timed transcript cues when a transcript is connected. Every word, with its time. */
  transcript?: TranscriptCue[] | null;
};
export type TranscriptCue = { start: number; end: number; text: string };
