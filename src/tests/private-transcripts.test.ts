import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { availableTranscriptIds, loadTranscript } from "../lib/academy-transcript.server";

const text = "WEBVTT\n\n00:00:00.000 --> 00:00:06.000\nA private lesson example.\n";
const valid = {
  source_vtt: text, source_sha256: createHash("sha256").update(text).digest("hex"),
  media_version: "1", active: true,
};
function database(rows: Record<string, typeof valid>) {
  return {
    readPrivateTranscript: async (id: string) => ({ data: rows[id] ?? null, error: null }),
    storage: { from: () => ({ download: async () => ({ data: null, error: true }) }) },
  };
}

describe("Private recording transcripts", () => {
  it("loads the complete private source only when its digest and recording version match", async () => {
    const cues = await loadTranscript("private-test-valid", "PRIVATE_TEST_VALID", database({ "private-test-valid": valid }));
    expect(cues).toEqual([{ start: 0, end: 6, text: "A private lesson example." }]);
  });
  it("rejects inactive, damaged and wrong-recording captions", async () => {
    for (const [kind, change] of Object.entries({
      inactive: { active: false }, damaged: { source_sha256: "0".repeat(64) },
      replaced: { media_version: "old-recording" },
    })) {
      const id = `private-test-${kind}`;
      expect(await loadTranscript(id, `PRIVATE_TEST_${kind.toUpperCase()}`, database({ [id]: { ...valid, ...change } }))).toBeNull();
    }
  });
  it("does not advertise a configured source which is empty or invalid", async () => {
    const rows = {
      "private-catalogue-valid": valid,
      "private-catalogue-invalid": { ...valid, active: false },
    };
    const ids = await availableTranscriptIds(Object.keys(rows).map((id) => ({ id, envKey: id.replaceAll("-", "_").toUpperCase() })), database(rows));
    expect(ids).toEqual(["private-catalogue-valid"]);
  });
  it("rechecks the transcript after a recording version changes", async () => {
    const key = "PRIVATE_VERSION_CHANGE";
    const original = process.env[`ACADEMY_MEDIA_VERSION_${key}`];
    const db = database({ "private-version-change": valid });
    try {
      process.env[`ACADEMY_MEDIA_VERSION_${key}`] = "1";
      expect(await loadTranscript("private-version-change", key, db)).not.toBeNull();
      process.env[`ACADEMY_MEDIA_VERSION_${key}`] = "2";
      expect(await loadTranscript("private-version-change", key, db)).toBeNull();
    } finally {
      if (original === undefined) delete process.env[`ACADEMY_MEDIA_VERSION_${key}`];
      else process.env[`ACADEMY_MEDIA_VERSION_${key}`] = original;
    }
  });
});
