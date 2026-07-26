import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  emailSegmentUpdateForProduct,
  SUMMIT_EMAIL_TAGS,
} from "../lib/summit-email-segmentation";

const NEXT_STEPS = readFileSync("src/routes/next-steps.tsx", "utf8");
const VIP = readFileSync("src/routes/offer/vip-upgrade.tsx", "utf8");
const VAULT = readFileSync(
  "src/routes/offer/implementation-vault.tsx",
  "utf8",
);
const INTENSIVE = readFileSync("src/routes/strategy-intensive.tsx", "utf8");

describe("every funnel exit lands on a confirmation page", () => {
  it("keeps every decline pointed at /next-steps", () => {
    expect(VIP).toContain('to="/next-steps"');
    expect(VAULT).toContain('to="/next-steps"');
    expect(INTENSIVE).toContain('to="/next-steps"');
  });

  it("renders one confirmation for GA, VIP, Vault, or Intensive", () => {
    expect(NEXT_STEPS).toContain('level: "ga"');
    expect(NEXT_STEPS).toContain('level: "vip"');
    expect(NEXT_STEPS).toContain('level: "vault"');
    expect(NEXT_STEPS).toContain('level: "intensive"');
    expect(NEXT_STEPS).toContain("Your current purchase is safe");
    expect(NEXT_STEPS).toContain(
      "Your ticket stays complete even when you pass on every optional upgrade.",
    );
  });

  it("uses a separate no-upsell exit video for each final purchase level", () => {
    for (const key of [
      "VITE_SUMMIT_VIDEO_EXIT_GA",
      "VITE_SUMMIT_VIDEO_EXIT_VIP",
      "VITE_SUMMIT_VIDEO_EXIT_VAULT",
      "VITE_SUMMIT_VIDEO_EXIT_INTENSIVE",
    ]) {
      expect(NEXT_STEPS).toContain(key);
    }
  });

  it("keeps the VIP Build Lab immediately after Day 2", () => {
    expect(NEXT_STEPS).toContain("Sunday, August 30 · 4:15–5:45 PM Eastern");
    expect(NEXT_STEPS).toContain("15 minutes after Day 2 ends");
  });
});

describe("email segmentation follows verified purchases", () => {
  it("keeps cumulative purchase history and one current level", () => {
    const vault = emailSegmentUpdateForProduct("vault");
    expect(vault.mergeFields.SUMMITLVL).toBe("VAULT");
    expect(vault.activateTags).toContain(SUMMIT_EMAIL_TAGS.buyer);
    expect(vault.activateTags).toContain(SUMMIT_EMAIL_TAGS.ga);
    expect(vault.activateTags).toContain(SUMMIT_EMAIL_TAGS.vip);
    expect(vault.activateTags).toContain(SUMMIT_EMAIL_TAGS.vault);
    expect(vault.activateTags).toContain(SUMMIT_EMAIL_TAGS.currentVault);
    expect(vault.deactivateTags).toContain(SUMMIT_EMAIL_TAGS.currentGa);
    expect(vault.deactivateTags).toContain(SUMMIT_EMAIL_TAGS.currentVip);
    expect(vault.deactivateTags).toContain(SUMMIT_EMAIL_TAGS.currentIntensive);
  });

  it("maps GA, VIP upgrade, Vault, and Intensive to the right highest level", () => {
    expect(emailSegmentUpdateForProduct("ga").highestLevel).toBe("ga");
    expect(emailSegmentUpdateForProduct("vip_upgrade").highestLevel).toBe("vip");
    expect(emailSegmentUpdateForProduct("vault").highestLevel).toBe("vault");
    expect(emailSegmentUpdateForProduct("intensive").highestLevel).toBe(
      "intensive",
    );
  });
});
