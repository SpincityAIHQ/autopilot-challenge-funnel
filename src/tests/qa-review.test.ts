import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  isQaReviewStage,
  qaReviewStageLabel,
  qaScopesForStage,
} from "@/lib/qa-review";

const CONFIG = readFileSync("src/lib/challenge-config.ts", "utf8");
const HOOK = readFileSync("src/hooks/use-entitlement-summary.ts", "utf8");
const PANEL = readFileSync("src/components/QaReviewPanel.tsx", "utf8");

describe("QA review stages", () => {
  it("maps each owner-review stage to the expected display scopes", () => {
    expect(qaScopesForStage("anonymous")).toEqual([]);
    expect(qaScopesForStage("ga")).toEqual(["ga"]);
    expect(qaScopesForStage("vip")).toEqual(["ga", "vip"]);
    expect(qaScopesForStage("vault")).toEqual(["ga", "vip", "vault"]);
    expect(qaScopesForStage("intensive")).toEqual([
      "ga",
      "vip",
      "vault",
      "intensive",
    ]);
  });

  it("rejects unknown review stages", () => {
    expect(isQaReviewStage("ga")).toBe(true);
    expect(isQaReviewStage("free")) .toBe(false);
    expect(isQaReviewStage(null)).toBe(false);
  });

  it("provides clear owner-facing labels", () => {
    expect(qaReviewStageLabel("anonymous")).toBe("Anonymous / gated");
    expect(qaReviewStageLabel("intensive")).toBe("Intensive buyer");
  });
});

describe("QA review safety boundaries", () => {
  it("forces every checkout handoff off during review mode", () => {
    expect(CONFIG).toContain("if (isQaReviewRuntimeEnabled()) return false;");
    expect(CONFIG.match(/if \(isQaReviewRuntimeEnabled\(\)\) return false;/g)?.length)
      .toBe(2);
  });

  it("uses QA scopes only in the client-side entitlement presentation hook", () => {
    expect(HOOK).toContain("getQaReviewScopes");
    expect(HOOK).toContain("never creates a server session");
    expect(HOOK).not.toContain("fulfill_summit_payment");
  });

  it("the review panel contains no payment, Supabase, or entitlement write calls", () => {
    expect(PANEL).not.toContain("fetch(");
    expect(PANEL).not.toContain("supabase");
    expect(PANEL).not.toContain("fulfill_summit_payment");
    expect(PANEL).not.toContain("window.location.href = checkout");
    expect(PANEL).toContain("OWNER QA · NO PAYMENT");
  });
});
