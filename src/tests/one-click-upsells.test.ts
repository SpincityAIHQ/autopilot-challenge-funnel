import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  getOneClickConfig,
  isOneClickProduct,
  ONE_CLICK_SUCCESS_PATH,
  oneClickEligibility,
} from "../lib/commas-one-click.server";

const COMPONENT = readFileSync(
  "src/components/OfferPurchaseAction.tsx",
  "utf8",
);
const API = readFileSync("src/routes/api/public/one-click-offer.ts", "utf8");
const MIGRATION = readFileSync(
  "supabase/migrations/20260726074500_one_click_charge_attempts.sql",
  "utf8",
);
const ENV = readFileSync(".env.example", "utf8");
const CONFIRMED = readFileSync("src/routes/confirmed.tsx", "utf8");
const VIP = readFileSync("src/routes/offer/vip-upgrade.tsx", "utf8");
const VAULT = readFileSync(
  "src/routes/offer/implementation-vault.tsx",
  "utf8",
);
const INTENSIVE = readFileSync("src/routes/strategy-intensive.tsx", "utf8");

describe("Commas one-click configuration", () => {
  it("stays off unless the server-only gate, environment, API key, and IDs exist", () => {
    expect(getOneClickConfig({})).toBeNull();
    expect(
      getOneClickConfig({
        COMMAS_ONE_CLICK_ENABLED: "true",
        COMMAS_API_ENV: "sandbox",
        COMMAS_API_KEY: "test_key",
        COMMAS_PRODUCT_ID_VIP_UPGRADE: "vip_service",
        COMMAS_PRODUCT_ID_VAULT: "vault_service",
      }),
    ).toEqual({
      enabled: true,
      environment: "sandbox",
      apiKey: "test_key",
      baseUrl: "https://qa.dev-fan-basis.com",
      serviceIds: {
        vip_upgrade: "vip_service",
        vault: "vault_service",
      },
    });
  });

  it("supports VIP and Vault only — never the $1,000 Intensive", () => {
    expect(isOneClickProduct("vip_upgrade")).toBe(true);
    expect(isOneClickProduct("vault")).toBe(true);
    expect(isOneClickProduct("intensive")).toBe(false);
    expect(MIGRATION).toContain("product IN ('vip_upgrade', 'vault')");
    expect(MIGRATION).not.toContain("'vault', 'intensive'");
  });

  it("enforces the sequential entitlement graph", () => {
    expect(oneClickEligibility(["ga"], "vip_upgrade")).toEqual({
      eligible: true,
      alreadyOwned: false,
    });
    expect(oneClickEligibility(["ga", "vip_upgrade"], "vip_upgrade")).toEqual({
      eligible: false,
      alreadyOwned: true,
    });
    expect(oneClickEligibility(["vip"], "vault")).toEqual({
      eligible: true,
      alreadyOwned: false,
    });
    expect(oneClickEligibility(["vip", "vault"], "vault")).toEqual({
      eligible: false,
      alreadyOwned: true,
    });
  });

  it("continues to the correct next funnel page", () => {
    expect(ONE_CLICK_SUCCESS_PATH.vip_upgrade).toBe(
      "/offer/implementation-vault",
    );
    expect(ONE_CLICK_SUCCESS_PATH.vault).toBe("/strategy-intensive");
  });
});

describe("one-click security and buyer consent", () => {
  it("keeps sensitive Commas identifiers and amount authority server-side", () => {
    expect(COMPONENT).not.toContain("customerId");
    expect(COMPONENT).not.toContain("paymentMethodId");
    expect(COMPONENT).not.toContain("COMMAS_API_KEY");
    expect(API).toContain("verifiedIdentity");
    expect(API).toContain("session_active_scopes");
    expect(API).toContain("expectedTotalCents");
  });

  it("requires same-origin, rate limiting, explicit confirmation, and duplicate reservation", () => {
    expect(API).toContain("assertSameOrigin");
    expect(API).toContain("consumeRateLimit");
    expect(API).toContain("confirmed: z.literal(true)");
    expect(API).toContain("reserve_one_click_charge");
    expect(API).toContain("finish_one_click_charge");
    expect(MIGRATION).toContain("one_click_charge_active_buyer_product");
    expect(MIGRATION).toContain("status IN ('pending', 'succeeded', 'unknown')");
  });

  it("shows the exact amount and saved card before the buyer clicks", () => {
    expect(COMPONENT).toContain("One click authorizes a one-time charge");
    expect(COMPONENT).toContain("last4");
    expect(COMPONENT).toContain("No subscription");
    expect(COMPONENT).toContain("confirmed: true");
  });

  it("fulfills immediately through the same idempotent RPC as the webhook", () => {
    expect(API).toContain("fulfill_summit_payment");
    expect(API).toContain("charge.chargeId");
    expect(API).toContain("payment-received-fulfillment-pending");
  });
});

describe("funnel integration", () => {
  it("uses the one-click action directly below the offer videos", () => {
    for (const source of [CONFIRMED, VIP, VAULT]) {
      expect(source).toContain("OfferPurchaseAction");
    }
    const vipVideo = VIP.indexOf("<FunnelVideoSlot");
    const vipAction = VIP.indexOf("<OfferPurchaseAction", vipVideo);
    expect(vipAction).toBeGreaterThan(vipVideo);
    const vaultVideo = VAULT.indexOf("<FunnelVideoSlot");
    const vaultAction = VAULT.indexOf("<OfferPurchaseAction", vaultVideo);
    expect(vaultAction).toBeGreaterThan(vaultVideo);
  });

  it("keeps the Intensive on a full checkout with live inventory", () => {
    expect(INTENSIVE).not.toContain("OfferPurchaseAction");
    expect(INTENSIVE).toContain('resolveCheckoutUrl("intensive"');
    expect(INTENSIVE).toContain("useIntensiveSlotsRemaining");
  });

  it("documents all server-only activation variables", () => {
    expect(ENV).toContain("COMMAS_ONE_CLICK_ENABLED=false");
    expect(ENV).toContain("COMMAS_API_ENV=sandbox");
    expect(ENV).toContain("COMMAS_API_KEY=");
  });
});
