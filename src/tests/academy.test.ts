import { describe, it, expect } from "bun:test";
import { createHmac } from "node:crypto";
import { mergeIntervals, coverage, tierAllows, nextStep, LESSONS } from "../lib/academy";
import { scoreAnswers, lessonContent } from "../lib/academy-content.server";
import { verifyShopifySignature, reconcileLines } from "../lib/academy-commerce.server";
import { readLimitedBody } from "../lib/academy-http.server";
describe("Academy learning evidence", () => {
  it("does not count a seek gap or repeat viewing", () => {
    const spans = mergeIntervals(
      [
        [0, 10],
        [90, 100],
        [5, 15],
        [0, 10],
      ],
      100,
    );
    expect(spans).toEqual([
      [0, 15],
      [90, 100],
    ]);
    expect(coverage(spans, 100)).toBe(25);
  });
  it("rejects non-finite observations", () => {
    expect(
      coverage(
        [
          [0, Infinity],
          [NaN, 100],
        ],
        100,
      ),
    ).toBe(0);
  });
  it("does not bundle accelerator and summit access by assumption", () => {
    expect(tierAllows(["vault"], "ga")).toBe(true);
    expect(tierAllows(["ga"], "vip")).toBe(false);
    expect(tierAllows(["accelerator"], "vault")).toBe(false);
    expect(tierAllows([], "free")).toBe(true);
  });
  it("has distinct questions for every lesson without exposing keys", () => {
    const lessons = LESSONS.filter((l) => l.kind === "lesson");
    const prompts = lessons.map((l) => lessonContent(l.id)!.questions[0].prompt);
    expect(new Set(prompts).size).toBe(lessons.length);
    expect(JSON.stringify(lessonContent("free-webinar"))).not.toContain('"correct"');
  });
  it("gives Accelerator session replays a tracked slot but no invented quiz or workbook", () => {
    const sessions = LESSONS.filter((l) => l.kind === "session");
    expect(sessions.length).toBeGreaterThan(0);
    for (const s of sessions) {
      const c = lessonContent(s.id)!;
      expect(c.questions).toEqual([]);
      expect(c.workbook).toEqual([]);
      expect(s.tier).toBe("accelerator");
    }
    expect(scoreAnswers(sessions[0].id, [0, 0, 0]).total).toBe(0);
  });
  it("scores against lesson-specific server keys", () => {
    expect(scoreAnswers("free-webinar", [0, 2, 1]).score).toBe(3);
    expect(scoreAnswers("business-before-ai", [0, 2, 1]).score).toBe(1);
  });
  it("does not claim mastery with no evidence", () => {
    expect(nextStep()).toContain("Start the lesson");
  });
});
describe("Academy commerce boundary", () => {
  it("authenticates the exact raw body", () => {
    const raw = '{"id":123}';
    const signature = createHmac("sha256", "test-secret").update(raw).digest("base64");
    expect(verifyShopifySignature(raw, signature, "test-secret")).toBe(true);
    expect(verifyShopifySignature(raw + " ", signature, "test-secret")).toBe(false);
    expect(verifyShopifySignature(raw, "invalid", "test-secret")).toBe(false);
  });
  const lines = [
    {
      id: "one",
      quantity: 1,
      currentQuantity: 1,
      variant: { id: "gid://shopify/ProductVariant/50980696129783" },
    },
    {
      id: "two",
      quantity: 1,
      currentQuantity: 0,
      variant: { id: "gid://shopify/ProductVariant/50980697571575" },
    },
  ];
  it("revokes only refunded lines in a partially refunded order", () => {
    const result = reconcileLines(
      { test: false, cancelledAt: null, displayFinancialStatus: "PARTIALLY_REFUNDED" },
      lines,
    );
    expect(result.map((x) => x.active)).toEqual([true, false]);
  });
  it("grants nothing for test, cancelled, pending, unknown or group-seat ambiguity", () => {
    expect(
      reconcileLines({ test: true, cancelledAt: null, displayFinancialStatus: "PAID" }, lines)[0]
        .active,
    ).toBe(false);
    expect(
      reconcileLines(
        { test: false, cancelledAt: "2026-09-06", displayFinancialStatus: "PAID" },
        lines,
      )[0].active,
    ).toBe(false);
    expect(
      reconcileLines(
        { test: false, cancelledAt: null, displayFinancialStatus: "PENDING" },
        lines,
      )[0].active,
    ).toBe(false);
    expect(
      reconcileLines({ test: false, cancelledAt: null, displayFinancialStatus: "PAID" }, [
        { ...lines[0], quantity: 2, currentQuantity: 2 },
      ])[0].active,
    ).toBe(false);
  });
  it("retains verified variant context if a variant was deleted", () => {
    expect(
      reconcileLines(
        { test: false, cancelledAt: null, displayFinancialStatus: "PAID" },
        [{ ...lines[0], variant: null }],
        { one: { variant_id: "50980696129783" } },
      )[0].active,
    ).toBe(true);
  });
});
describe("Request bounds", () => {
  it("stops a body that exceeds the limit while streaming", async () => {
    let rejected = false;
    try {
      await readLimitedBody(
        new Request("https://example.test", { method: "POST", body: "123456" }),
        5,
      );
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
  });
});

describe("Tutor provider disclosure", () => {
  it("names the vendor and exact model that is configured", async () => {
    const { tutorProviderLabel } = await import("../lib/academy.server");
    delete process.env.ACADEMY_TUTOR_MODEL;
    expect(tutorProviderLabel()).toBe("Lovable AI (Google Gemini · google/gemini-3.7-flash)");
    process.env.ACADEMY_TUTOR_MODEL = "openai/gpt-5.4-mini";
    expect(tutorProviderLabel()).toBe("Lovable AI (OpenAI · openai/gpt-5.4-mini)");
    delete process.env.ACADEMY_TUTOR_MODEL;
  });
});
