import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  generateReservationToken,
  isValidReservationToken,
} from "@/lib/reservation-token";
import { resolveReserveCheckoutUrl } from "@/lib/reserve-checkout";

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
    expect(isValidReservationToken("A".repeat(32))).toBe(false); // uppercase
    expect(isValidReservationToken(null)).toBe(false);
    expect(isValidReservationToken(undefined)).toBe(false);
    expect(isValidReservationToken(12345)).toBe(false);
  });
  it("generates distinct tokens", () => {
    const a = generateReservationToken();
    const b = generateReservationToken();
    expect(a).not.toBe(b);
  });
});

describe("reserve checkout URL resolver", () => {
  it("fails closed when env variables are unset", () => {
    // In the test env none of the three bundle URLs are configured.
    expect(resolveReserveCheckoutUrl("ga")).toBeNull();
    expect(resolveReserveCheckoutUrl("ga_vip")).toBeNull();
    expect(resolveReserveCheckoutUrl("ga_vip_vault")).toBeNull();
  });
});

describe("reserve funnel — copy + config guards", () => {
  const root = process.cwd();

  const readReserveIndex = () =>
    readFileSync(join(root, "src/routes/reserve/index.tsx"), "utf8");
  const readReserveVip = () =>
    readFileSync(join(root, "src/routes/reserve/vip.tsx"), "utf8");
  const readReserveVault = () =>
    readFileSync(join(root, "src/routes/reserve/vault.tsx"), "utf8");
  const readEnvExample = () => readFileSync(join(root, ".env.example"), "utf8");

  it("/reserve landing has NO $22 / $99 / $298 price text", () => {
    const src = readReserveIndex();
    expect(src.includes("$22")).toBe(false);
    expect(src.includes("$99")).toBe(false);
    expect(src.includes("$298")).toBe(false);
  });

  it("/reserve landing has the exact reassurance line and reserve CTA", () => {
    const src = readReserveIndex();
    expect(
      src.includes("Nothing is charged. You choose how to settle on the next page."),
    ).toBe(true);
    expect(src.includes("Reserve My Seat")).toBe(true);
  });

  it("/reserve/vip shows both $22 and $99 totals and exact bullets", () => {
    const src = readReserveVip();
    expect(src.includes("$22")).toBe(true);
    expect(src.includes("$99 Total")).toBe(true);
    expect(src.includes("All six build workbooks")).toBe(true);
    expect(src.includes("Two hours with me after each day")).toBe(true);
    expect(src.includes("30 days of recordings")).toBe(true);
    expect(src.includes("You're holding $22. VIP adds $77.")).toBe(true);
  });

  it("/reserve/vault shows both $99 and $298 totals and exact bullets", () => {
    const src = readReserveVault();
    expect(src.includes("$99")).toBe(true);
    expect(src.includes("$298 Total")).toBe(true);
    expect(src.includes("MVP App Builder")).toBe(true);
    expect(src.includes("AI Business GPS")).toBe(true);
    expect(
      src.includes(
        "30 days of NuAmenti 3 Gold — emailed August 10, use it for three weeks before the Summit",
      ),
    ).toBe(true);
    expect(src.includes("Full NuAmenti 3 Day recording")).toBe(true);
    expect(
      src.includes("Your VIP reservation carries forward. The Vault adds $199."),
    ).toBe(true);
  });

  it("uses token (not id) in the routing / URL surface", () => {
    const vip = readReserveVip();
    const vault = readReserveVault();
    expect(vip.includes("/reserve/vault?t=") || vip.includes('to: "/reserve/vault"')).toBe(true);
    expect(vault.includes('"/reserve/vip"') || vault.includes("resolveReserveCheckoutUrl")).toBe(true);
    // Tokens must NEVER be routed as id
    expect(/[?&]id=/.test(vip)).toBe(false);
    expect(/[?&]id=/.test(vault)).toBe(false);
  });

  it("declares all three reserve-bundle env variables in .env.example", () => {
    const env = readEnvExample();
    expect(env.includes("VITE_COMMAS_URL_GA=")).toBe(true);
    expect(env.includes("VITE_COMMAS_URL_GA_VIP=")).toBe(true);
    expect(env.includes("VITE_COMMAS_URL_GA_VIP_VAULT=")).toBe(true);
  });

  it("did NOT modify src/lib/tiers.ts price ladder or webhook bundle contract", () => {
    const tiers = readFileSync(join(root, "src/lib/tiers.ts"), "utf8");
    expect(tiers.includes("2200")).toBe(true); // GA
    expect(tiers.includes("7700")).toBe(true); // VIP upgrade
    expect(tiers.includes("19900")).toBe(true); // Vault
    expect(tiers.includes("100000")).toBe(true); // Intensive
    const helpers = readFileSync(
      join(root, "src/lib/webhook-helpers.ts"),
      "utf8",
    );
    expect(helpers.includes("ga_vip_vault")).toBe(true);
  });
});
