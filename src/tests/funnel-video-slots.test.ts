import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const COMPONENT = readFileSync("src/components/FunnelVideoSlot.tsx", "utf8");
const CHECKOUT = readFileSync("src/routes/checkout.tsx", "utf8");
const CONFIRMED = readFileSync("src/routes/confirmed.tsx", "utf8");
const VIP = readFileSync("src/routes/offer/vip-upgrade.tsx", "utf8");
const VAULT = readFileSync("src/routes/offer/implementation-vault.tsx", "utf8");
const INTENSIVE = readFileSync("src/routes/strategy-intensive.tsx", "utf8");
const NEXT_STEPS = readFileSync("src/routes/next-steps.tsx", "utf8");
const CONFIG = readFileSync("src/lib/challenge-config.ts", "utf8");

const ROUTES = [CHECKOUT, CONFIRMED, VIP, VAULT, INTENSIVE, NEXT_STEPS];

describe("mobile funnel video slots", () => {
  it("uses a responsive 16:9 full-width slot", () => {
    expect(COMPONENT).toContain("aspect-video w-full");
    expect(COMPONENT).toContain("Responsive 16:9");
  });

  it("always renders a placeholder for an unconfigured slot", () => {
    // A slot with no URL must stay visible rather than collapsing, so missing
    // videos are obvious on every host instead of silently leaving a gap.
    expect(COMPONENT).toContain("Autoplay video embed slot");
    expect(COMPONENT).toContain("{envKey}");
    expect(COMPONENT).not.toContain("return null");
  });

  it("adds a funnel video slot to every paid funnel page", () => {
    for (const route of ROUTES) {
      expect(route).toContain("FunnelVideoSlot");
    }
  });

  it("places the final video between the page intro and verified card", () => {
    const intro = NEXT_STEPS.indexOf("Your current purchase is safe");
    const video = NEXT_STEPS.indexOf("<FunnelVideoSlot");
    const verified = NEXT_STEPS.indexOf("<ProductThankYou");
    expect(intro).toBeGreaterThan(-1);
    expect(video).toBeGreaterThan(intro);
    expect(verified).toBeGreaterThan(video);
  });

  it("maps offer videos and separate final-exit videos", () => {
    for (const key of [
      "VITE_SUMMIT_VIDEO_CHECKOUT",
      "VITE_SUMMIT_VIDEO_VIP_OFFER",
      "VITE_SUMMIT_VIDEO_EXIT_GA",
      "VITE_SUMMIT_VIDEO_EXIT_VIP",
      "VITE_SUMMIT_VIDEO_EXIT_VAULT",
      "VITE_SUMMIT_VIDEO_EXIT_INTENSIVE",
    ]) {
      expect(CONFIG).toContain(key);
    }
  });
});
