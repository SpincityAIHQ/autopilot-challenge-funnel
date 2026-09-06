import type { TranscriptCue } from "./academy";
import { formatTime } from "./academy";
/**
 * Timed transcripts give the guides every word and its time. Accepts WebVTT
 * (Vimeo's caption export) or SRT. Cues are ordered, merged when a caption is
 * split mid-sentence across tiny cues, and bounded so a runaway file cannot
 * blow up a request.
 */
function stamp(value: string): number | null {
  const m = value.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  return h * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, "0")) / 1000;
}
export function parseTranscript(raw: string, maxCues = 4000): TranscriptCue[] {
  const lines = raw.replace(/\r/g, "").split("\n");
  const cues: TranscriptCue[] = [];
  let i = 0;
  while (i < lines.length && cues.length < maxCues) {
    const line = lines[i].trim();
    const arrow = line.match(/^(\S+)\s+-->\s+(\S+)/);
    if (!arrow) {
      i++;
      continue;
    }
    const start = stamp(arrow[1]),
      end = stamp(arrow[2]);
    i++;
    const text: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      text.push(
        lines[i]
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .trim(),
      );
      i++;
    }
    if (start === null || end === null || end < start) continue;
    const joined = text.join(" ").replace(/\s+/g, " ").trim();
    if (!joined) continue;
    const last = cues.at(-1);
    // Merge caption fragments shorter than 3s into the previous cue so cues read as sentences.
    if (last && start - last.end < 0.75 && last.end - last.start < 3 && last.text.length < 160) {
      last.end = end;
      last.text = `${last.text} ${joined}`;
    } else cues.push({ start, end, text: joined.slice(0, 600) });
  }
  return cues;
}
const STOP = new Set(
  "a an and are as at be but by for from has have how i if in is it its of on or so that the this to was we what when where which who why will with you your me my our can do does did not no yes just like about into than then them they their there these those over under again more most very".split(
    " ",
  ),
);
export function keywords(text: string) {
  return [...new Set(text.toLowerCase().match(/[a-z0-9][a-z0-9'-]{2,}/g) ?? [])].filter(
    (w) => !STOP.has(w),
  );
}
/**
 * Pick the cues the guide should read: the ones that match the question, the
 * moments around where the student stopped, and the opening of each missed
 * chapter. Ordered by time so the brief reads like the recording.
 */
export function retrieveCues(
  cues: TranscriptCue[],
  options: { question?: string; around?: number[]; limit?: number; window?: number } = {},
): TranscriptCue[] {
  const limit = options.limit ?? 40,
    window = options.window ?? 45;
  const picked = new Map<number, TranscriptCue>();
  for (const at of options.around ?? [])
    for (const c of cues)
      if (c.end >= at - window && c.start <= at + window) picked.set(c.start, c);
  const terms = keywords(options.question ?? "");
  if (terms.length) {
    const scored = cues
      .map((c) => {
        const words = new Set(keywords(c.text));
        return { c, score: terms.filter((t) => words.has(t)).length };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.c.start - b.c.start);
    for (const { c } of scored) {
      if (picked.size >= limit) break;
      picked.set(c.start, c);
    }
  }
  return [...picked.values()].sort((a, b) => a.start - b.start).slice(0, limit);
}
export function cueLabel(c: TranscriptCue) {
  return `${formatTime(c.start)} ${c.text}`;
}
