import { describe, expect, it } from "bun:test";
import { MAX_TRANSCRIPT_CHARACTERS, parseTranscript, retrieveCues } from "../lib/transcript";

function timestamp(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}.000`;
}
function source(count: number) {
  return "WEBVTT\n\n" + Array.from({ length: count }, (_, i) =>
    `${timestamp(i * 5)} --> ${timestamp(i * 5 + 5)}\n${i === count - 1 ? "Closingfeedback final passage." : `Passage ${i + 1}.`}\n`,
  ).join("\n");
}
describe("Long session transcripts", () => {
  it("keeps the final passage in a recording with more than 4000 cues", () => {
    const cues = parseTranscript(source(5040));
    expect(cues.length).toBe(5040);
    expect(cues.at(-1)?.end).toBe(25200);
    expect(retrieveCues(cues, { question: "Closingfeedback" }).at(-1)?.text)
      .toBe("Closingfeedback final passage.");
  });
  it("rejects unsupported sources instead of silently returning a partial transcript", () => {
    expect(() => parseTranscript(source(3), 2)).toThrow(RangeError);
    expect(() => parseTranscript("x".repeat(MAX_TRANSCRIPT_CHARACTERS + 1))).toThrow(RangeError);
  });
  it("preserves the complete words of a long caption within the file size limit", () => {
    const text = "Word ".repeat(150).trim() + " Closingfeedback.";
    const cues = parseTranscript(`WEBVTT\n\n00:00:00.000 --> 00:00:30.000\n${text}\n`);
    expect(cues[0].text).toBe(text);
  });
});
