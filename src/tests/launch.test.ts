import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { ticketRowsForOrder, emailTicketsEnabled } from "../lib/email-tickets";
import { academyMessagePolicy } from "../lib/academy-message-policy";
import { launchReadiness, readinessSummary } from "../lib/launch-readiness";
import { composePurchaseConfirmedMessage } from "../lib/academy-messages";

describe("Email-matched tickets from live purchases", () => {
  const grants = [
    { line_id: "l1", tier: "ga", email: " Buyer@Example.com ", active: true },
    { line_id: "l2", tier: "accelerator", email: "buyer@example.com", active: true },
    { line_id: "l3", tier: "vip", email: "buyer@example.com", active: false },
  ];
  it("mirrors paid lines into claimable tickets and never invents Accelerator access", () => {
    const rows = ticketRowsForOrder({
      orderId: "gid://shopify/Order/1",
      grants,
      needsReview: false,
    });
    expect(rows.map((r) => r.tier)).toEqual(["ga", "vip"]);
    expect(rows[0].email).toBe("buyer@example.com");
    expect(rows[0].active).toBe(true);
    expect(rows[1].active).toBe(false);
    expect(rows[0].source_key).toBe("gid://shopify/Order/1:l1");
    const withEnd = ticketRowsForOrder({
      orderId: "o",
      grants,
      needsReview: false,
      acceleratorEndsAt: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(withEnd.find((r) => r.tier === "accelerator")?.expires_at).toBeTruthy();
    expect(
      ticketRowsForOrder({ orderId: "o", grants, needsReview: true }).every((r) => !r.active),
    ).toBe(true);
    expect(emailTicketsEnabled({ ACADEMY_EMAIL_TICKETS_ENABLED: "true" })).toBe(true);
    expect(emailTicketsEnabled({})).toBe(false);
  });
  it("treats purchase confirmations as transactional email, SMS only with consent", () => {
    expect(academyMessagePolicy("purchase_confirmed").transactional).toBe(true);
    expect(academyMessagePolicy("purchase_confirmed").sms).toBe(false);
    expect(academyMessagePolicy("purchase_confirmed_sms").sms).toBe(true);
    const m = composePurchaseConfirmedMessage("vault", false, "buyer@example.com");
    expect(m.message_subject).toContain("Emerald Vault Key");
    expect(m.action_url).toBe("https://aiautopilotsummit.com/join");
    expect(composePurchaseConfirmedMessage("ga", true, "b@e.com").action_url).toBe(
      "https://aiautopilotsummit.com/learn",
    );
  });
  it("runs the ticket sync and confirmations from reconciliation", () => {
    const src = readFileSync("src/lib/academy-commerce.server.ts", "utf8");
    expect(src).toContain("syncEmailTickets(id)");
    expect(src).toContain("queuePurchaseConfirmations(id)");
    const loop = readFileSync("src/lib/academy-integrations.server.ts", "utf8");
    expect(loop).toContain("deliverPurchaseConfirmation");
    expect(loop).toContain('ticket_activation: "email_match"');
  });
});

describe("Launch board", () => {
  const base = {
    env: {} as Record<string, string | undefined>,
    connected: [] as string[],
    transcripts: [] as string[],
    counts: {
      importedTickets: 0,
      importedClaimed: 0,
      orders: 0,
      activeGrants: 0,
      pendingOutbox: 0,
      unknownOutbox: 0,
      profiles: 0,
      waitlist: 0,
    },
    lastOutboxRunAt: null as string | null,
  };
  it("names every blocking connection and the human action for each", () => {
    const items = launchReadiness(base);
    const summary = readinessSummary(items);
    expect(summary.go).toBe(false);
    for (const key of [
      "free-training-video",
      "shopify",
      "email-tickets",
      "ghl",
      "scheduler",
      "tutor",
    ])
      expect(summary.blockers).toContain(key);
    for (const i of items) {
      expect(i.action.length).toBeGreaterThan(10);
      expect(JSON.stringify(i)).not.toMatch(/sk_|shpat_|Bearer /);
    }
  });
  it("goes green when the connections are present", () => {
    const items = launchReadiness({
      ...base,
      env: {
        ACADEMY_SHOPIFY_SHOP: "x.myshopify.com",
        SHOPIFY_ADMIN_ACCESS_TOKEN: "t",
        ACADEMY_SHOPIFY_WEBHOOK_SECRET: "s",
        ACADEMY_SHOPIFY_ENABLED: "true",
        ACADEMY_EMAIL_TICKETS_ENABLED: "true",
        ACADEMY_ACCELERATOR_ENDS_AT: "2026-12-31T23:59:59Z",
        ACADEMY_GHL_ENABLED: "true",
        ACADEMY_GHL_WEBHOOK_URL: "https://services.leadconnectorhq.com/hooks/abc",
        LOVABLE_API_KEY: "k",
        RATE_LIMIT_HMAC_SECRET: "r",
      },
      connected: [
        "free-webinar",
        "business-before-ai",
        "hire-the-ai-team",
        "coordinate-the-business",
        "measure-the-system",
        "own-the-platform",
        "implementation-lab",
      ],
      lastOutboxRunAt: new Date().toISOString(),
    });
    expect(readinessSummary(items).go).toBe(true);
  });
});
