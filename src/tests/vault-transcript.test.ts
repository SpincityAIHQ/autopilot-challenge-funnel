import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { SUMMIT_OFFERS, vaultAllows } from "../lib/academy";
import { keywords, parseTranscript, retrieveCues } from "../lib/transcript";
import { VAULT_CATEGORIES, VAULT_ITEM_CATEGORY, vaultCatalogue } from "../lib/vault";
import { RESOURCE_METAS } from "../lib/resource-metadata";

const VTT = `WEBVTT

00:00:01.000 --> 00:00:03.500
Welcome to the free training.

00:00:03.600 --> 00:00:05.000
Let's start with actual intelligence.

00:05:12.000 --> 00:05:18.000
<v Spin>Give your agent a <b>job card</b>: trigger, inputs, result, owner.

00:12:40.000 --> 00:12:46.000
A completion receipt proves the customer got value.
`;

describe("Timed transcript", () => {
  it("parses WebVTT with voice tags and merges caption fragments into sentences", () => {
    const cues = parseTranscript(VTT);
    expect(cues.length).toBe(3);
    expect(cues[0].text).toBe(
      "Welcome to the free training. Let's start with actual intelligence.",
    );
    expect(cues[1]).toEqual({
      start: 312,
      end: 318,
      text: "Give your agent a job card: trigger, inputs, result, owner.",
    });
    expect(parseTranscript("garbage")).toEqual([]);
  });
  it("parses SRT timestamps too", () => {
    const cues = parseTranscript("1\n00:01:00,500 --> 00:01:04,000\nHello there\n");
    expect(cues[0].start).toBe(60.5);
  });
  it("retrieves the moments AI Spin needs: question matches and the drop-off neighbourhood", () => {
    const cues = parseTranscript(VTT);
    const byQuestion = retrieveCues(cues, { question: "Where is the job card explained?" });
    expect(byQuestion.map((c) => c.start)).toEqual([312]);
    const around = retrieveCues(cues, { around: [760], window: 30 });
    expect(around.map((c) => c.start)).toEqual([760]);
    expect(retrieveCues(cues, { question: "the and of" })).toEqual([]);
    expect(keywords("What is the completion receipt?")).toEqual(["completion", "receipt"]);
  });
  it("ships the two Google Meet transcripts converted from Drive as bundled WebVTT", () => {
    for (const [id, minCues] of [
      ["coordinate-the-business", 400],
      ["own-the-platform", 1000],
    ] as const) {
      const cues = parseTranscript(readFileSync(`src/lib/transcripts/${id}.vtt`, "utf8"));
      expect(cues.length).toBeGreaterThan(minCues);
      expect(cues.every((c, i) => i === 0 || c.start >= cues[i - 1].start)).toBe(true);
      expect(cues.some((c) => c.text.includes("<v"))).toBe(false);
    }
    const loader = readFileSync("src/lib/academy-transcript.server.ts", "utf8");
    expect(loader).toContain('import.meta.glob<string>("./transcripts/*.vtt"');
    expect(loader).toContain("api.vimeo.com/videos/");
  });
  it("briefs AI Spin with transcript excerpts and timestamps", () => {
    const src = readFileSync("src/lib/academy.server.ts", "utf8");
    expect(src).toContain("transcript: cues");
    expect(src).toContain("retrieveCues");
    expect(src).toContain("cite its timestamp");
  });
});

describe("The Vault", () => {
  it("opens for Emerald Vault Key holders and Accelerator students only", () => {
    expect(vaultAllows(["vault"])).toBe(true);
    expect(vaultAllows(["accelerator"])).toBe(true);
    expect(vaultAllows(["ga", "vip"])).toBe(false);
    expect(vaultAllows([])).toBe(false);
  });
  it("files every resource into a category and keeps content server-side", () => {
    for (const m of RESOURCE_METAS) expect(VAULT_ITEM_CATEGORY[m.slug]).toBeDefined();
    const ids = new Set(VAULT_CATEGORIES.map((c) => c.id));
    for (const i of vaultCatalogue()) expect(ids.has(i.category)).toBe(true);
    for (const id of ["skills", "prompts", "plugins"]) expect(ids.has(id as never)).toBe(true);
    const route = readFileSync("src/routes/vault.tsx", "utf8");
    expect(route).not.toContain("resource-content.server");
    expect(route).not.toContain("Rules of the fence");
    const server = readFileSync("src/lib/academy-vault.server.ts", "utf8");
    expect(server).toContain("vaultAllows(grants)");
  });
  it("is routed and named in the shell", () => {
    const tree = readFileSync("src/routeTree.gen.ts", "utf8");
    expect(tree.includes("'/vault'") || tree.includes('"/vault"')).toBe(true);
    expect(readFileSync("src/components/AcademyFrame.tsx", "utf8")).toContain('href="/vault"');
  });
  it("describes the Emerald ticket without leftover event copy", () => {
    const vault = SUMMIT_OFFERS.find((o) => o.tier === "vault")!;
    expect(vault.includes).not.toContain("Sally");
    expect(vault.includes).toContain("Vault");
  });
});

describe("Classroom layout", () => {
  it("stacks AI Notes, Activity Book and the guide under the recording, Thoth public and AI Spin inside the Accelerator", () => {
    const src = readFileSync("src/components/AcademyClassroom.tsx", "utf8");
    const notes = src.indexOf('id="ai-notes"');
    const book = src.indexOf('id="activity-book"');
    const ask = src.indexOf('id="ask-ai-spin"');
    expect(notes).toBeGreaterThan(src.indexOf('id="academy-player"'));
    expect(book).toBeGreaterThan(notes);
    expect(ask).toBeGreaterThan(book);
    expect(src).toContain("GuideAvatar");
    expect(src).toContain("guideFor(ticket)");
    const { GUIDES, guideFor } = require("../lib/academy") as typeof import("../lib/academy");
    expect(GUIDES.thoth.avatar).toBe("/thoth.webp");
    expect(guideFor({ accelerator: false }).name).toBe("Thoth");
    expect(guideFor({ accelerator: true }).name).toBe("AI Spin");
    const server = readFileSync("src/lib/academy.server.ts", "utf8");
    expect(server).toContain("THOTH_SYSTEM_PROMPT");
    expect(server).toContain("SPIN_SYSTEM_PROMPT");
    expect(server).toContain('d.guide === "spin" && !ticket.accelerator');
    const tree = readFileSync("src/routeTree.gen.ts", "utf8");
    expect(tree.includes("'/thoth'") || tree.includes('"/thoth"')).toBe(true);
  });
});
