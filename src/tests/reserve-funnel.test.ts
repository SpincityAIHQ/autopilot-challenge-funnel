import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateReservationToken, isValidReservationToken } from "@/lib/reservation-token";
import {
  RESERVE_ENV_KEY,
  resolveReserveCheckoutUrl,
  validateReserveCheckoutUrl,
  type ReserveBundle,
} from "@/lib/reserve-checkout";
import { computeReserveTransition, isAtOrAbove } from "@/lib/reserve-tier-transition";

describe("reservation tokens", () => {
  it("generates exactly 32 lowercase hex characters", () => {
    for (let i = 0; i < 20; i++) {
      const t = generateReservationToken();
      expect(t.length).toBe(32);
      expect(/^[a-f0-9]{32}$/.test(t)).toBe(true);
      expect(isValidReservationToken(t)).toBe(true);
    }
  });
  it("rejects non-32-char / non-hex / non-string inputs", () => {
    expect(isValidReservationToken("short")).toBe(false);
    expect(isValidReservationToken("g".repeat(32))).toBe(false);
    expect(isValidReservationToken("A".repeat(32))).toBe(false);
    expect(isValidReservationToken(null)).toBe(false);
    expect(isValidReservationToken(undefined)).toBe(false);
    expect(isValidReservationToken(12345)).toBe(false);
  });
  it("generates distinct tokens", () => {
    expect(generateReservationToken()).not.toBe(generateReservationToken());
  });
});

describe("reserve checkout URL — pure validator", () => {
  const GOOD = "https://www.fanbasis.com/i/example";

  it("accepts a valid HTTPS URL on the default allowed host", () => {
    expect(validateReserveCheckoutUrl("ga", { VITE_COMMAS_URL_GA: GOOD })).toBe(GOOD);
  });
  it("rejects HTTP (non-HTTPS)", () => {
    expect(
      validateReserveCheckoutUrl("ga", {
        VITE_COMMAS_URL_GA: "http://www.fanbasis.com/i/x",
      }),
    ).toBeNull();
  });
  it("rejects URLs with embedded credentials", () => {
    expect(
      validateReserveCheckoutUrl("ga", {
        VITE_COMMAS_URL_GA: "https://user:pass@www.fanbasis.com/i/x",
      }),
    ).toBeNull();
  });
  it("rejects off-allowlist hosts", () => {
    expect(
      validateReserveCheckoutUrl("ga", {
        VITE_COMMAS_URL_GA: "https://evil.example.com/x",
      }),
    ).toBeNull();
  });
  it("fails closed when the variable is missing or empty", () => {
    expect(validateReserveCheckoutUrl("ga", {})).toBeNull();
    expect(validateReserveCheckoutUrl("ga", { VITE_COMMAS_URL_GA: "   " })).toBeNull();
  });
  it("honors the additional allowed-hosts env variable", () => {
    const url = "https://checkout.partner.co/x";
    expect(validateReserveCheckoutUrl("ga", { VITE_COMMAS_URL_GA: url })).toBeNull();
    expect(
      validateReserveCheckoutUrl("ga", {
        VITE_COMMAS_URL_GA: url,
        VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS: "checkout.partner.co",
      }),
    ).toBe(url);
  });
  it("declares the exact env variable names", () => {
    expect(RESERVE_ENV_KEY.ga).toBe("VITE_COMMAS_URL_GA");
    expect(RESERVE_ENV_KEY.ga_vip).toBe("VITE_COMMAS_URL_GA_VIP");
    expect(RESERVE_ENV_KEY.ga_vip_vault).toBe("VITE_COMMAS_URL_GA_VIP_VAULT");
  });
  it("live resolver fails closed in this test env", () => {
    for (const b of ["ga", "ga_vip", "ga_vip_vault"] as ReserveBundle[]) {
      expect(resolveReserveCheckoutUrl(b)).toBeNull();
    }
  });
});

describe("reserve tier-transition helper", () => {
  it("ga + vip -> advances to ga_vip", () => {
    const r = computeReserveTransition("ga", "vip");
    expect(r.kind).toBe("advance");
    expect(r.kind === "advance" ? r.next : null).toBe("ga_vip");
  });
  it("ga_vip + vip -> noop (idempotent, stays ga_vip)", () => {
    const r = computeReserveTransition("ga_vip", "vip");
    expect(r.kind).toBe("noop");
    expect(r.kind === "noop" ? r.next : null).toBe("ga_vip");
  });
  it("ga_vip_vault + vip -> noop (never downgrade)", () => {
    const r = computeReserveTransition("ga_vip_vault", "vip");
    expect(r.kind).toBe("noop");
    expect(r.kind === "noop" ? r.next : null).toBe("ga_vip_vault");
  });
  it("ga + vault -> vip_required", () => {
    expect(computeReserveTransition("ga", "vault").kind).toBe("vip_required");
  });
  it("ga_vip + vault -> advances to ga_vip_vault", () => {
    const r = computeReserveTransition("ga_vip", "vault");
    expect(r.kind).toBe("advance");
    expect(r.kind === "advance" ? r.next : null).toBe("ga_vip_vault");
  });
  it("ga_vip_vault + vault -> noop (never downgrade)", () => {
    const r = computeReserveTransition("ga_vip_vault", "vault");
    expect(r.kind).toBe("noop");
    expect(r.kind === "noop" ? r.next : null).toBe("ga_vip_vault");
  });
  it("isAtOrAbove respects rank order", () => {
    expect(isAtOrAbove("ga_vip_vault", "ga_vip")).toBe(true);
    expect(isAtOrAbove("ga_vip", "ga_vip_vault")).toBe(false);
    expect(isAtOrAbove("ga_vip", "ga_vip")).toBe(true);
  });
});

describe("reserve funnel — copy, config, tokens, and headers", () => {
  const root = process.cwd();
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  const readReserveIndex = () => read("src/routes/reserve/index.tsx");
  const readLanding = () => read("src/routes/index.tsx");
  const readLandingForm = () => read("src/components/reserve/LandingReservationForm.tsx");
  const readReserveVip = () => read("src/routes/reserve/vip.tsx");
  const readReserveVault = () => read("src/routes/reserve/vault.tsx");
  const readUpgradeApi = () => read("src/routes/api/public/reserve-upgrade.ts");
  const readReserveApi = () => read("src/routes/api/public/reserve.ts");
  const readFrame = () => read("src/components/reserve/ReserveFrame.tsx");
  const readEnvExample = () => read(".env.example");

  it("/reserve landing has NO prices", () => {
    const src = readReserveIndex();
    expect(src.includes("$22")).toBe(false);
    expect(src.includes("$99")).toBe(false);
    expect(src.includes("$298")).toBe(false);
  });
  it("/reserve landing has exact reassurance + CTA copy", () => {
    const src = readReserveIndex();
    expect(src.includes("Nothing is charged. You choose how to settle on the next page.")).toBe(
      true,
    );
    expect(src.includes("Reserve My Seat")).toBe(true);
  });
  it("the live landing page captures the lead and advances directly to the GA decision", () => {
    const landing = readLanding();
    const form = readLandingForm();
    expect(landing.includes("LandingReservationForm")).toBe(true);
    expect(landing.includes('to="/reserve"')).toBe(false);
    expect(form.includes('id="reserve-seat"')).toBe(true);
    expect(form.includes('fetch("/api/public/reserve"')).toBe(true);
    expect(form.includes("Reserve My General Admission Seat")).toBe(true);
    expect(form.includes("first_name")).toBe(true);
    expect(form.includes('name="email"')).toBe(true);
    expect(form.includes('name="phone"')).toBe(true);
    expect(readReserveApi().includes("/reserve/vip?t=${token}")).toBe(true);
  });
  it("uses the exact hyphen date punctuation on all reserve pages", () => {
    expect(readReserveIndex().includes("August 29-30 · 1-4 PM ET both days")).toBe(true);
    expect(readReserveVip().includes("August 29-30")).toBe(true);
  });
  it("/reserve/vip has correct bullets, prices and does NOT have the removed line", () => {
    const src = readReserveVip();
    expect(src.includes("$22")).toBe(true);
    expect(src.includes("$99 Total")).toBe(true);
    expect(src.includes("All six build workbooks")).toBe(true);
    expect(src.includes("Two hours with me after each day")).toBe(true);
    expect(src.includes("30 days of recordings")).toBe(true);
    expect(src.includes("You're holding $22. VIP adds $77.")).toBe(true);
    expect(src.includes("Two-day live Summit access. Nothing else added.")).toBe(false);
  });
  it("/reserve/vault has correct bullets and totals", () => {
    const src = readReserveVault();
    expect(src.includes("$99")).toBe(true);
    expect(src.includes("$298 Total")).toBe(true);
    expect(src.includes("MVP App Builder")).toBe(true);
    expect(src.includes("AI Business GPS")).toBe(true);
    expect(
      src
        .replace(/\s+/g, " ")
        .includes(
          "30 days of NuAmenti 3 Gold — emailed August 10, use it for three weeks before the Summit",
        ),
    ).toBe(true);
    expect(src.includes("Full NuAmenti 3 Day recording")).toBe(true);
    expect(src.includes("Your VIP reservation carries forward. The Vault adds $199.")).toBe(true);
  });
  it("uses token (never id) in every URL surface", () => {
    const files = [
      readReserveIndex(),
      readReserveVip(),
      readReserveVault(),
      readUpgradeApi(),
      readReserveApi(),
    ];
    for (const src of files) expect(/[?&]id=/.test(src)).toBe(false);
    expect(readReserveApi().includes("/reserve/vip?t=${token}")).toBe(true);
    expect(readUpgradeApi().includes("/reserve/vault?t=${token}")).toBe(true);
    expect(readUpgradeApi().includes("/reserve/vip?t=${token}")).toBe(true);
  });
  it(".env.example declares the three reserve-bundle env variables", () => {
    const env = readEnvExample();
    expect(env.includes("VITE_COMMAS_URL_GA=")).toBe(true);
    expect(env.includes("VITE_COMMAS_URL_GA_VIP=")).toBe(true);
    expect(env.includes("VITE_COMMAS_URL_GA_VIP_VAULT=")).toBe(true);
  });

  it("did NOT modify tiers.ts price ladder or webhook bundle contract", () => {
    const tiers = read("src/lib/tiers.ts");
    expect(tiers.includes("2200")).toBe(true);
    expect(tiers.includes("7700")).toBe(true);
    expect(tiers.includes("19900")).toBe(true);
    expect(tiers.includes("100000")).toBe(true);
    const helpers = read("src/lib/webhook-helpers.ts");
    expect(helpers.includes("ga_vip_vault")).toBe(true);
  });

  it("all three reserve routes install actual no-store response headers via server-runtime setResponseHeader and AWAIT the helper", () => {
    for (const src of [readReserveIndex(), readReserveVip(), readReserveVault()]) {
      expect(src.includes(`from "@/lib/reserve-headers"`)).toBe(true);
      expect(src.includes("applyReserveNoStoreHeaders()")).toBe(true);
      // beforeLoad must be async AND await the helper.
      expect(
        /beforeLoad:\s*async\s*\([^)]*\)\s*=>\s*\{\s*await\s+applyReserveNoStoreHeaders\(\)\s*;?\s*\}/.test(
          src,
        ),
      ).toBe(true);
      // robots meta stays too.
      expect(src.includes('"noindex, nofollow"')).toBe(true);
    }
  });

  it("the vault upgrade API server-validates the vault checkout URL before returning", () => {
    const src = readUpgradeApi();
    expect(src.includes("resolveReserveCheckoutUrlFromProcessEnv")).toBe(true);
    expect(src.includes('"ga_vip_vault"')).toBe(true);
    // Compare-and-set predicate
    expect(src.includes('.eq("tier_reserved", currentTier)')).toBe(true);
  });

  it("design tokens are exact and NO legacy reserve-funnel emerald values remain anywhere under reserve/", () => {
    const frame = readFrame();
    expect(frame.includes("#0FBF7F")).toBe(true);
    expect(frame.includes("#067F53")).toBe(true);
    for (const t of ["--void", "--panel", "--emerald", "--emerald-lo", "--gold-gradient"]) {
      expect(frame.includes(t)).toBe(true);
    }

    // Scan EVERY reserve source file, not only the three pages.
    const scanned = [
      "src/components/reserve/ReserveFrame.tsx",
      "src/components/reserve/RevealOnView.tsx",
      "src/components/reserve/WingedPlaneMark.tsx",
      "src/routes/reserve/index.tsx",
      "src/routes/reserve/vip.tsx",
      "src/routes/reserve/vault.tsx",
      "src/lib/reserve-checkout.ts",
      "src/lib/reserve-tier-transition.ts",
      "src/lib/reserve-headers.ts",
      "src/lib/reserve-headers.server.ts",
      "src/routes/api/public/reserve.ts",
      "src/routes/api/public/reserve-upgrade.ts",
    ]
      .map(read)
      .join("\n");
    for (const bad of ["#30D68B", "#14C97D", "#14996A", "#08543A", "rgba(48,214,139"]) {
      expect(scanned.includes(bad)).toBe(false);
    }
  });

  it("primary CTA breathing animation is scoped to the emerald primary CTA only", () => {
    const frame = readFrame();
    // Only one @keyframes and only the primary CTA class references it.
    expect(frame.match(/@keyframes reserve-breath/g)?.length ?? 0).toBe(1);
    expect(frame.includes(".reserve-cta-primary")).toBe(true);
    expect(/animation: reserve-breath/.test(frame)).toBe(true);
    // Old emerald-btn class must not exist.
    expect(frame.includes(".reserve-emerald-btn")).toBe(false);
  });

  it("reserve-card--vault exists in the frame and is used ONLY on /reserve/vault", () => {
    const frame = readFrame();
    expect(frame.includes(".reserve-card--vault")).toBe(true);
    // Used only on the Vault page.
    expect(readReserveVault().includes("reserve-card--vault")).toBe(true);
    expect(readReserveVip().includes("reserve-card--vault")).toBe(false);
    expect(readReserveIndex().includes("reserve-card--vault")).toBe(false);
    // VIP keeps the lighter border-and-lift treatment.
    expect(readReserveVip().includes("reserve-card--emerald")).toBe(true);
  });

  it("scroll reveal component exists, uses IntersectionObserver, respects reduced motion, clears its timeout, and stays visible without JS", () => {
    const src = read("src/components/reserve/RevealOnView.tsx");
    expect(src.includes("IntersectionObserver")).toBe(true);
    expect(src.includes("prefers-reduced-motion")).toBe(true);
    expect(src.includes("io.disconnect()")).toBe(true);
    // New: pending stagger timeout is cleared on unmount.
    expect(src.includes("clearTimeout")).toBe(true);
    const frame = readFrame();
    expect(frame.includes(".reserve-reveal { opacity: 1; transform: none; }")).toBe(true);
    expect(frame.includes(".reserve-reveal.is-mounted")).toBe(true);
  });
});
