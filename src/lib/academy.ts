/** Public catalogue only. Paid lesson text, answer keys and media stay server-side. */
export type AcademyTier = "free" | "ga" | "vip" | "vault" | "accelerator";
export type LessonMeta = {
  id: string;
  title: string;
  stage: string;
  tier: AcademyTier;
  summary: string;
  skill: string;
};
export const LESSONS: LessonMeta[] = [
  {
    id: "free-webinar",
    title: "Your business, cleared for takeoff",
    stage: "Start here",
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
    stage: "Autopilot Accelerator",
    tier: "accelerator",
    summary: "Take one workflow from a job card to a tested operating routine.",
    skill: "Demonstrate a working system",
  },
];
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
    includes: "VIP + Day 3 Emerald intensive and Sally session",
    url: "https://spincityhq.com/products/ai-autopilot-summit-vip-emerald-vault-key",
  },
] as const;
export const COMMUNITY_URL =
  "https://www.skool.com/the-ascended-masters/about?ref=ce11d00bd3994b97bfd25e10976d9f0b";
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
export function tierAllows(grants: string[], tier: AcademyTier) {
  if (tier === "free") return true;
  if (tier === "accelerator") return grants.includes("accelerator");
  const rank: Record<string, number> = { ga: 1, vip: 2, vault: 3 };
  return grants.some((g) => (rank[g] ?? 0) >= rank[tier]);
}
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
export function nextStep(p?: LessonProgress) {
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
  media: { url: string; version: string; duration: number; captions: string | null } | null;
};
