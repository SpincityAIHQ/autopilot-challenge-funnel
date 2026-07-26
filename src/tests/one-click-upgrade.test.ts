import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  isEligibleForOneClick,
  isOneClickProduct,
  oneClickButtonLabel,
  oneClickDisclosure,
  secureCheckoutLabel,
  ONE_CLICK_PRODUCTS,
} from "@/lib/one-click";
import { readPath, sanitizeBrand, sanitizeLast4 } from "@/lib/commas-one-click.server";
import { expectedTotalCents } from "@/lib/tiers";

const SHARED = readFileSync("src/lib/one-click.ts", "utf8");
const ADAPTER = readFileSync("src/lib/commas-one-click.server.ts", "utf8");
const ROUTE = readFileSync("src/routes/api/public/one-click-upgrade.ts", "utf8");
const BUTTON = readFileSync("src/components/OneClickUpgradeButton.tsx", "utf8");
const MIGRATION = readFileSync("supabase/migrations/20260726120000_one_click_charges.sql", "utf8");
const CONFIRMED = readFileSync("src/routes/confirmed.tsx", "utf8");
const VIP = readFileSync("src/routes/offer/vip-upgrade.tsx", "utf8");
const VAULT = readFileSync("src/routes/offer/implementation-vault.tsx", "utf8");
const INTENSIVE = readFileSync("src/routes/strategy-intensive.tsx", "utf8");

// Everything the browser can load: no server-only module may appear here.
const CLIENT_SOURCES = [SHARED, BUTTON, CONFIRMED, VIP, VAULT, INTENSIVE];

describe("one-click scope is limited to VIP and Vault", () => {
  it("offers one-click for exactly the $77 VIP and $199 Vault", () => {
    expect([...ONE_CLICK_PRODUCTS]).toEqual(["vip_upgrade", "vault"]);
    expect(expectedTotalCents("vip_upgrade")).toBe(7700);
    expect(expectedTotalCents("vault")).toBe(19900);
  });

  it("never one-clicks the $1,000 Intensive", () => {
    expect(isOneClickProduct("intensive")).toBe(false);
    // The database refuses it too, so a crafted request cannot reach a charge.
    expect(MIGRATION).toContain("CHECK (product IN ('vip_upgrade','vault'))");
    expect(MIGRATION).toContain("IF _product NOT IN ('vip_upgrade','vault') THEN");
    // The Intensive page keeps its full Commas checkout handoff.
    expect(INTENSIVE).not.toContain("OneClickUpgradeButton");
  });

  it("rejects anything that is not a one-click product", () => {
    for (const bad of ["ga", "vip", "mentorship", "", null, undefined, 7]) {
      expect(isOneClickProduct(bad)).toBe(false);
    }
  });
});

describe("one-click entitlement rules", () => {
  it("requires verified GA before the VIP upgrade", () => {
    expect(isEligibleForOneClick("vip_upgrade", [])).toBe(false);
    expect(isEligibleForOneClick("vip_upgrade", ["ga"])).toBe(true);
  });

  it("does not re-sell VIP to someone who already has it", () => {
    expect(isEligibleForOneClick("vip_upgrade", ["ga", "vip"])).toBe(false);
    expect(isEligibleForOneClick("vip_upgrade", ["ga", "vip_upgrade"])).toBe(false);
  });

  it("requires verified VIP before the Vault", () => {
    expect(isEligibleForOneClick("vault", ["ga"])).toBe(false);
    expect(isEligibleForOneClick("vault", ["ga", "vip"])).toBe(true);
    expect(isEligibleForOneClick("vault", ["ga", "vip_upgrade"])).toBe(true);
  });

  it("does not re-sell the Vault to someone who already has it", () => {
    expect(isEligibleForOneClick("vault", ["ga", "vip", "vault"])).toBe(false);
  });

  it("re-checks the same rules inside the database", () => {
    expect(MIGRATION).toContain("vip_upgrade requires an active GA entitlement");
    expect(MIGRATION).toContain("vault requires an active VIP entitlement");
    expect(MIGRATION).toContain("vip already owned");
    expect(MIGRATION).toContain("vault already owned");
  });
});

describe("card data never reaches the browser", () => {
  it("keeps the API key and endpoint config in the server-only module", () => {
    expect(ADAPTER).toContain("COMMAS_API_KEY");
    for (const source of CLIENT_SOURCES) {
      expect(source).not.toContain("COMMAS_API_KEY");
      expect(source).not.toContain("COMMAS_API_BASE_URL");
      expect(source).not.toContain("customerId");
      expect(source).not.toContain("paymentMethodId");
    }
  });

  it("keeps client components away from the server adapter entirely", () => {
    for (const source of CLIENT_SOURCES) {
      expect(source).not.toContain("commas-one-click.server");
    }
    // The route reaches it only through a server-side dynamic import, never a
    // static top-level one that a client bundle could follow.
    expect(ROUTE).toMatch(/await import\(\s*"@\/lib\/commas-one-click\.server"\s*\)/);
    expect(ROUTE).not.toContain('from "@/lib/commas-one-click.server"');
  });

  it("serializes only the card brand and last four digits", () => {
    const route = ROUTE.replace(/\s+/g, " ");
    expect(route).toContain("card: { brand: card.brand, last4: card.last4 }");
    expect(SHARED).toContain("brand: string");
    expect(SHARED).toContain("last4: string");

    // The ids exist on the server-side card object, but the route may touch
    // them in exactly one place: the arguments handed to Commas. Anywhere else
    // would mean they are within reach of a response body.
    const customerUses = ROUTE.match(/card\.customerId/g) ?? [];
    const methodUses = ROUTE.match(/card\.paymentMethodId/g) ?? [];
    expect(customerUses.length).toBe(1);
    expect(methodUses.length).toBe(1);

    const chargeCall = ROUTE.indexOf("chargeSavedCard(");
    expect(ROUTE.indexOf("card.customerId")).toBeGreaterThan(chargeCall);
    expect(ROUTE.indexOf("card.paymentMethodId")).toBeGreaterThan(chargeCall);
  });

  it("refuses to pass through anything that is not a four-digit suffix", () => {
    expect(sanitizeLast4("4242")).toBe("4242");
    expect(sanitizeLast4("4242424242424242")).toBeNull();
    expect(sanitizeLast4("42a2")).toBeNull();
    expect(sanitizeLast4("")).toBeNull();
    expect(sanitizeLast4(undefined)).toBeNull();
  });

  it("normalizes the brand label instead of trusting it verbatim", () => {
    expect(sanitizeBrand("visa")).toBe("Visa");
    expect(sanitizeBrand("<script>")).toBe("Script");
    expect(sanitizeBrand("")).toBe("Card");
    expect(sanitizeBrand(null)).toBe("Card");
  });
});

describe("the server owns the price", () => {
  it("derives the amount from the catalog, never from the request", () => {
    expect(ROUTE).toContain("const amountCents = expectedTotalCents(product);");
    // A price supplied by the caller must not appear anywhere in the handler.
    expect(ROUTE).not.toContain("parsed.amount");
    expect(ROUTE).not.toContain("body.priceCents");
  });

  it("requires a verified session and explicit confirmation per charge", () => {
    expect(ROUTE).toContain("const session = await resolveSession();");
    expect(ROUTE).toContain("session_active_scopes");
    expect(ROUTE).toContain("if (parsed.confirm !== true) return");
    expect(ROUTE).toContain("assertSameOrigin(request)");
    expect(ROUTE).toContain("consumeRateLimit");
  });
});

describe("duplicate-charge protection", () => {
  it("claims an atomic row before any money can move", () => {
    const claim = ROUTE.indexOf("begin_one_click_charge");
    const charge = ROUTE.indexOf("chargeSavedCard(", claim);
    expect(claim).toBeGreaterThan(-1);
    expect(charge).toBeGreaterThan(claim);
  });

  it("blocks a second attempt while one is pending, paid, or ambiguous", () => {
    // Read the CREATE INDEX statement itself, not just "somewhere after it" —
    // the same predicate appears in several queries further down the file, so
    // an unscoped search would still pass with the index weakened.
    const statement = MIGRATION.match(
      /CREATE UNIQUE INDEX IF NOT EXISTS one_click_charges_active_idx[\s\S]*?;/,
    )?.[0];
    expect(statement).toBeDefined();
    expect(statement).toContain("public.one_click_charges");
    expect(statement).toContain("(lower(buyer_email), product)");
    expect(statement).toContain("WHERE status IN ('pending','succeeded','unknown')");
  });

  it("sends the guard row id to Commas as the idempotency key", () => {
    expect(ROUTE).toContain("idempotencyKey: chargeId");
    expect(ADAPTER).toContain('"idempotency-key": params.idempotencyKey');
  });

  it("only an explicit decline releases the guard for a retry", () => {
    // 'failed' is absent from the blocking predicate, so it frees the index.
    expect(MIGRATION).not.toContain("WHERE status IN ('pending','succeeded','failed','unknown')");
    expect(ADAPTER).toContain('export type ChargeOutcome = "succeeded" | "failed" | "unknown";');
  });

  it("treats an unreachable or unrecognized result as unknown, not failed", () => {
    expect(ADAPTER).toContain('return { outcome: "unknown", paymentId: null };');
    expect(ROUTE).toContain('_status: "unknown"');
    expect(ROUTE).toContain("doNotRetry: true");
  });

  it("cannot settle an attempt twice", () => {
    // The terminal update only matches a row that is still pending.
    const update = MIGRATION.indexOf("UPDATE public.one_click_charges");
    const guard = MIGRATION.indexOf("AND status = 'pending';", update);
    expect(guard).toBeGreaterThan(update);
  });

  it("never reopens the guard when fulfillment lags behind a real charge", () => {
    const fulfil = ROUTE.indexOf("fulfillment-deferred");
    expect(fulfil).toBeGreaterThan(-1);
    expect(ROUTE).toContain('_status: "succeeded"');
  });
});

describe("immediate fulfillment", () => {
  it("grants the entitlement without waiting for the webhook", () => {
    const charge = ROUTE.indexOf("chargeSavedCard(");
    const fulfil = ROUTE.indexOf("fulfill_summit_payment", charge);
    expect(fulfil).toBeGreaterThan(charge);
    // Keyed by the Commas payment id, so the later webhook is a safe no-op.
    expect(ROUTE).toContain("_commas_payment_id: result.paymentId");
  });
});

describe("secure-checkout fallback", () => {
  it("falls back rather than stranding the buyer", () => {
    expect(secureCheckoutLabel(7700)).toBe("Continue to Secure Checkout · $77");
    expect(secureCheckoutLabel(19900)).toBe("Continue to Secure Checkout · $199");
    for (const source of [VIP, VAULT]) {
      expect(source).toContain("secureCheckoutLabel");
      expect(source).toContain("fallback={secureCheckoutCta}");
    }
    expect(CONFIRMED).toContain("fallback={");
  });

  it("falls back whenever Commas is not fully configured", () => {
    expect(ADAPTER).toContain(
      'if (readEnv(env, "COMMAS_ONE_CLICK_ENABLED") !== "true") return null;',
    );
    expect(ROUTE).toContain('return unavailable(priceCents, "not-configured")');
    expect(ROUTE).toContain('return unavailable(priceCents, "no-saved-card")');
    expect(BUTTON).toContain("if (!oneClickOn || !card)");
  });

  it("never charges from the owner walkthrough", () => {
    expect(BUTTON).toContain("if (qaReview)");
  });
});

describe("one-click button copy", () => {
  it("names the exact card on the button", () => {
    expect(
      oneClickButtonLabel("vip_upgrade", 7700, {
        brand: "Visa",
        last4: "4242",
      }),
    ).toBe("Add VIP · $77 with Visa •••• 4242");
    expect(oneClickButtonLabel("vault", 19900, { brand: "Visa", last4: "4242" })).toBe(
      "Add the Vault · $199 with Visa •••• 4242",
    );
  });

  it("states the amount, the card, and that nothing recurs", () => {
    const copy = oneClickDisclosure(7700, { brand: "Visa", last4: "4242" });
    expect(copy).toBe(
      "One click authorizes a one-time $77 charge to Visa •••• 4242. No subscription.",
    );
  });
});

describe("adapter response parsing", () => {
  it("reads dotted response paths without throwing", () => {
    expect(readPath({ card: { last4: "4242" } }, "card.last4")).toBe("4242");
    expect(readPath({}, "card.last4")).toBeUndefined();
    expect(readPath(null, "card.last4")).toBeUndefined();
    expect(readPath({ card: null }, "card.last4")).toBeUndefined();
  });
});
