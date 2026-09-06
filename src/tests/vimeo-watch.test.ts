import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  ACCELERATOR_DAYS,
  LESSONS,
  chapterStatus,
  nextOffer,
  parseChapters,
  ticketFor,
  watchSummary,
} from "../lib/academy";
import { WatchTracker, parseVimeoMessage, parseVimeoUrl, vimeoEmbedUrl } from "../lib/vimeo";
import { learningDeliveryEligible } from "../lib/academy-integrations.server";
import { slotMedia } from "../lib/academy-content.server";

describe("Vimeo slots", () => {
  it("accepts every share-link shape Spin pastes and keeps unlisted hashes", () => {
    expect(parseVimeoUrl("https://vimeo.com/1213741553")).toEqual({ id: "1213741553", hash: null });
    expect(parseVimeoUrl("https://vimeo.com/1213741553/4e82a76d61")).toEqual({
      id: "1213741553",
      hash: "4e82a76d61",
    });
    expect(parseVimeoUrl("https://vimeo.com/1213741553?h=4e82a76d61&share=copy")).toEqual({
      id: "1213741553",
      hash: "4e82a76d61",
    });
    expect(parseVimeoUrl("https://player.vimeo.com/video/1213741553?h=4e82a76d61")).toEqual({
      id: "1213741553",
      hash: "4e82a76d61",
    });
    expect(parseVimeoUrl("http://vimeo.com/1213741553")).toBeNull();
    expect(parseVimeoUrl("https://evil.example/1213741553")).toBeNull();
    expect(parseVimeoUrl("https://vimeo.com/channels/staffpicks/1213741553")).toBeNull();
  });
  it("builds a player URL with the messaging API on and Vimeo branding off", () => {
    const url = new URL(vimeoEmbedUrl({ id: "1213741553", hash: "abc123" }, "lesson-x"));
    expect(url.origin).toBe("https://player.vimeo.com");
    expect(url.pathname).toBe("/video/1213741553");
    expect(url.searchParams.get("h")).toBe("abc123");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("dnt")).toBe("1");
    expect(url.searchParams.get("autoplay")).toBeNull();
  });
  it("maps a Vimeo environment slot to tracked media and never leaks a private path", () => {
    process.env.ACADEMY_VIMEO_ACCELERATOR_DAY_01 = "https://vimeo.com/1213741553/4e82a76d61";
    process.env.ACADEMY_CHAPTERS_ACCELERATOR_DAY_01 = "0|Welcome;5:00|Build";
    const media = slotMedia("accelerator-day-01")!;
    expect(media.provider).toBe("vimeo");
    expect(media.version).toBe("vimeo:1213741553");
    expect(media.durationVerified).toBe(false);
    expect(media.chapters.map((c) => c.start)).toEqual([0, 300]);
    delete process.env.ACADEMY_VIMEO_ACCELERATOR_DAY_01;
    delete process.env.ACADEMY_CHAPTERS_ACCELERATOR_DAY_01;
    expect(slotMedia("accelerator-day-01")).toBeNull();
  });
  it("parses player messages in both string and object form", () => {
    expect(parseVimeoMessage('{"event":"timeupdate","data":{"seconds":4}}')).toEqual({
      event: "timeupdate",
      data: { seconds: 4 },
    });
    expect(parseVimeoMessage({ method: "getDuration", value: 90 })).toEqual({
      method: "getDuration",
      value: 90,
    });
    expect(parseVimeoMessage("not json")).toBeNull();
  });
});

describe("Watch telemetry", () => {
  it("turns continuous playback into intervals and never counts a seek", () => {
    const t = new WatchTracker();
    for (const s of [0, 0.25, 0.5, 0.75, 1, 1.25]) t.observe(s);
    t.observe(60); // seek forward
    for (const s of [60.25, 60.5, 60.75]) t.observe(s);
    t.close();
    expect(t.intervals()).toEqual([
      [0, 1.25],
      [60, 60.75],
    ]);
    t.reset();
    expect(t.intervals()).toEqual([]);
  });
  it("finds the drop-off point and the unwatched gaps", () => {
    const w = watchSummary({
      intervals: [
        [0, 120],
        [300, 330],
      ],
      duration: 600,
      position: 330,
    });
    expect(w.coverage).toBe(25);
    expect(w.dropOffAt).toBe(330);
    expect(w.gaps).toEqual([
      [120, 300],
      [330, 600],
    ]);
    expect(watchSummary({ intervals: [[0, 590]], duration: 600, position: 590 }).dropOffAt).toBe(
      null,
    );
  });
  it("names missed chapters from configured markers only", () => {
    expect(
      parseChapters("0|Intro;5:00|Job card;bad;12:30=Receipts", 900).map((c) => c.title),
    ).toEqual(["Intro", "Job card", "Receipts"]);
    expect(parseChapters("20:00|Beyond the end", 900)).toEqual([]);
    const rows = chapterStatus(parseChapters("0|Intro;300|Job card;600|Receipts"), [[0, 320]], 900);
    expect(rows.map((r) => r.status)).toEqual(["watched", "missed", "missed"]);
  });
  it("queues a drop-off reminder only for a partially watched, idle recording", () => {
    const base = {
      lesson_id: "accelerator-day-01",
      workbook_status: "draft",
      quiz_score: null,
      quiz_total: null,
      intervals: [[0, 100]] as [number, number][],
      duration: 400,
      position: 100,
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    };
    expect(learningDeliveryEligible("learning_dropoff", base)).toBe(true);
    expect(learningDeliveryEligible("learning_dropoff", { ...base, intervals: [[0, 380]] })).toBe(
      false,
    );
    expect(
      learningDeliveryEligible("learning_dropoff", {
        ...base,
        updated_at: new Date().toISOString(),
      }),
    ).toBe(false);
    // A session replay never gets an activity-book nudge it cannot act on.
    expect(learningDeliveryEligible("learning_stalled", base)).toBe(false);
  });
});

describe("Tickets and the next stage", () => {
  it("names the ticket AI Spin greets the student by", () => {
    expect(ticketFor([]).label).toBe("Free Training");
    expect(ticketFor(["ga"]).label).toBe("General Admission");
    expect(ticketFor(["ga", "vault"]).label).toBe("Emerald Vault Key");
    expect(ticketFor(["accelerator"]).label).toBe("Autopilot Accelerator");
    expect(ticketFor(["accelerator", "vip"]).label).toBe("Autopilot Accelerator + Summit + VIP");
    expect(ticketFor(["accelerator"]).code).toBe("ACC-FREE");
  });
  it("invites one stage up and stops when everything is held", () => {
    expect(nextOffer(ticketFor([]))?.tier).toBe("ga");
    expect(nextOffer(ticketFor(["vip"]))?.tier).toBe("vault");
    expect(nextOffer(ticketFor(["vault"]))?.tier).toBe("accelerator");
    expect(nextOffer(ticketFor(["vault", "accelerator"]))).toBeNull();
  });
  it("gives every Accelerator day its own environment slot", () => {
    expect(ACCELERATOR_DAYS[0].envKey).toBe("ACCELERATOR_DAY_01");
    expect(new Set(LESSONS.map((l) => l.envKey)).size).toBe(LESSONS.length);
    const env = readFileSync(".env.example", "utf8");
    for (const l of LESSONS) expect(env).toContain(`ACADEMY_VIMEO_${l.envKey}=`);
    expect(env).toContain("ACADEMY_BOOKING_URL=");
  });
  it("briefs AI Spin on ticket, drop-off, missed chapters and the graceful next stage", () => {
    const src = readFileSync("src/lib/academy.server.ts", "utf8");
    for (const phrase of [
      "ticket",
      "missedChapters",
      "stoppedAt",
      "nextStage",
      "bookOneOnOne",
      "Never pressure a struggling student",
    ])
      expect(src).toContain(phrase);
  });
  it("keeps 1-on-1 booking and the live avatar behind the Accelerator ticket", () => {
    const src = readFileSync("src/lib/academy.server.ts", "utf8");
    expect(src).toContain('const eligible = grants.includes("accelerator")');
    expect(src).toContain("url: eligible ? url : null");
    const route = readFileSync("src/routeTree.gen.ts", "utf8");
    expect(route.includes("'/book'") || route.includes('"/book"')).toBe(true);
  });
});
