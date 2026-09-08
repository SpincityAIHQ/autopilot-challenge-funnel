import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  academyCommerceReadiness,
  linePriceMatches,
  orderLineReviewIssues,
  reconcileLines,
} from "../lib/academy-commerce.server";
import { introPreferenceKey } from "../components/FunnelVideoSlot";
import { ghlDeliveryStatus } from "../lib/academy-integrations.server";
import {
  accessDeliveryFailureStatus,
  accessDeliveryResponseStatus,
} from "../lib/academy-delivery.server";

const read = (path: string) => readFileSync(path, "utf8");

const completeCommerceEnv: Record<string, string> = {
  SUPABASE_URL: "https://academy-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key-long-enough",
  ACADEMY_COMMERCE_SCHEMA_VERSION: "2026-09-08.2",
  ACADEMY_SHOPIFY_ENABLED: "true",
  ACADEMY_SHOPIFY_SHOP: "autopilot-academy.myshopify.com",
  SHOPIFY_ADMIN_ACCESS_TOKEN: "unit-test-admin-token-long-enough",
  ACADEMY_SHOPIFY_WEBHOOK_SECRET: "webhook-secret-at-least-16",
  ACADEMY_PAID_ACCESS_ENABLED: "true",
  ACADEMY_ACCESS_CODES_ENABLED: "true",
  ACADEMY_ACCESS_CODE_SECRET: "a".repeat(32),
  ACADEMY_ACCESS_TERMS_JSON: JSON.stringify({
    ga: { starts: "redemption", hours: 24, version: "ga-v1" },
    vip: { starts: "redemption", hours: 48, version: "vip-v1" },
    vault: { starts: "redemption", hours: 8760, version: "vault-v1" },
    accelerator: { starts: "redemption", hours: 2880, version: "accelerator-v1" },
  }),
  ACADEMY_ACCESS_EMAIL_ENABLED: "true",
  ACADEMY_GHL_ACCESS_WEBHOOK_URL: "https://services.leadconnectorhq.com/hooks/test-access",
  ACADEMY_SCHEDULER_SECRET: "s".repeat(32),
};

describe("academy commerce launch gate", () => {
  it("opens only when the complete payment-to-access configuration is present", () => {
    expect(academyCommerceReadiness(completeCommerceEnv)).toEqual({ ready: true, reasons: [] });
  });

  const missingConfigCases: Array<[string, string, string | undefined]> = [
    ["Supabase URL", "supabase_url_missing", undefined],
    ["Supabase service role", "service_role_missing", undefined],
    ["commerce schema version", "commerce_schema_missing", undefined],
    ["Shopify switch", "shopify_disabled", undefined],
    ["Shop domain", "shop_domain_missing", undefined],
    ["Admin token", "admin_token_missing", undefined],
    ["Webhook signature secret", "webhook_secret_missing", undefined],
    ["Paid-access switch", "paid_access_disabled", undefined],
    ["Access-code switch", "access_codes_disabled", undefined],
    ["Access-code secret", "access_code_secret_missing", undefined],
    ["Access terms", "access_terms_missing", undefined],
    ["Access-email switch", "access_email_disabled", undefined],
    ["Access-delivery hook", "access_webhook_missing", undefined],
    ["Scheduler secret", "scheduler_secret_missing", undefined],
  ];

  const envKeys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ACADEMY_COMMERCE_SCHEMA_VERSION",
    "ACADEMY_SHOPIFY_ENABLED",
    "ACADEMY_SHOPIFY_SHOP",
    "SHOPIFY_ADMIN_ACCESS_TOKEN",
    "ACADEMY_SHOPIFY_WEBHOOK_SECRET",
    "ACADEMY_PAID_ACCESS_ENABLED",
    "ACADEMY_ACCESS_CODES_ENABLED",
    "ACADEMY_ACCESS_CODE_SECRET",
    "ACADEMY_ACCESS_TERMS_JSON",
    "ACADEMY_ACCESS_EMAIL_ENABLED",
    "ACADEMY_GHL_ACCESS_WEBHOOK_URL",
    "ACADEMY_SCHEDULER_SECRET",
  ] as const;

  for (const [index, [label, expectedReason]] of missingConfigCases.entries()) {
    it(`stays closed without ${label}`, () => {
      const env = { ...completeCommerceEnv };
      delete env[envKeys[index]];
      const result = academyCommerceReadiness(env);
      expect(result.ready).toBe(false);
      expect(result.reasons).toContain(expectedReason);
    });
  }

  it("rejects partial or unsafe-looking configuration, not just absent values", () => {
    const env = {
      ...completeCommerceEnv,
      SUPABASE_URL: "http://academy-test.supabase.co",
      ACADEMY_SHOPIFY_SHOP: "shop.example.com",
      ACADEMY_GHL_ACCESS_WEBHOOK_URL: "https://example.com/hooks/not-ghl",
      ACADEMY_ACCESS_TERMS_JSON: JSON.stringify({
        ga: { starts: "purchase", hours: 24, version: "ga-v1" },
      }),
    };
    expect(academyCommerceReadiness(env)).toEqual({
      ready: false,
      reasons: [
        "supabase_url_missing",
        "shop_domain_missing",
        "access_terms_missing",
        "access_webhook_missing",
      ],
    });
  });

  it("publishes the server readiness bit and fails all paid routes closed while it is unknown", () => {
    const server = read("src/lib/academy.server.ts");
    expect(server).toContain("checkoutEnabled: academyCommerceReadiness().ready");

    const routeContracts = [
      ["src/routes/summit.tsx", "href={o.url}", "Checkout temporarily paused"],
      ["src/routes/vault.tsx", "href={vaultKey.url}", "New purchases temporarily paused"],
      [
        "src/routes/accelerator.tsx",
        "href={ACCELERATOR_OFFER.url}",
        "Enrollment checkout temporarily paused",
      ],
    ] as const;

    for (const [path, paidHref, pausedCopy] of routeContracts) {
      const route = read(path);
      expect(route).toContain("const checkoutEnabled = catalogue?.checkoutEnabled === true");
      expect(route).toContain("{checkoutEnabled ? (");
      expect(route).toContain(paidHref);
      expect(route).toContain(pausedCopy);
      expect(route).toContain('aria-disabled="true"');
    }

    for (const path of ["src/routes/reserve/vip.tsx", "src/routes/reserve/vault.tsx"]) {
      const legacyRoute = read(path);
      expect(legacyRoute).toContain("useCatalogue()?.checkoutEnabled === true");
      expect(legacyRoute).toContain("checkoutEnabled ? resolveReserveCheckoutUrl");
    }
  });
});

describe("dismissible page intros", () => {
  it("uses a URL-specific preference key so a replacement video is shown", () => {
    const first = introPreferenceKey("summit", "https://vimeo.com/111");
    expect(first).toBe(introPreferenceKey("summit", "https://vimeo.com/111"));
    expect(first).not.toBe(introPreferenceKey("summit", "https://vimeo.com/222"));
    expect(first).not.toBe(introPreferenceKey("vault", "https://vimeo.com/111"));
  });

  it("persists hide, supports restore, unmounts the hidden player, and bypasses hiding in QA", () => {
    const component = read("src/components/FunnelVideoSlot.tsx");
    expect(component).toContain('window.localStorage.getItem(storageKey) === "1"');
    expect(component).toContain('window.localStorage.setItem(storageKey, "1")');
    expect(component).toContain("window.localStorage.removeItem(storageKey)");
    expect(component).toContain('hidden ? "Show intro video" : "Don\'t show this intro again"');
    expect(component).toContain("!hidden || qaReview ? (");
    expect(component).toContain("introId && preferenceReady && !qaReview");
    expect(component).toContain("setHidden(false)");
    expect(component).toContain("if (!storageKey || qaReview)");
  });

  it("wires a stable intro identity on Summit, Vault, and Accelerator", () => {
    for (const [path, id] of [
      ["src/routes/summit.tsx", "summit"],
      ["src/routes/vault.tsx", "vault"],
      ["src/routes/accelerator.tsx", "accelerator"],
    ]) {
      expect(read(path)).toContain(`introId="${id}"`);
    }
  });
});

describe("durable training waitlist handoff", () => {
  it("stores the lead before idempotently queuing its GHL delivery", () => {
    const route = read("src/routes/api/public/training-waitlist.ts");
    expect(route.indexOf('.from("training_waitlist").insert')).toBeLessThan(
      route.indexOf('.from("academy_outbox").upsert'),
    );
    expect(route).toContain('name: "training_waitlist_joined"');
    expect(route).toContain("dedup_key: `training-waitlist:${eventId}`");
    expect(route).toContain('{ onConflict: "dedup_key", ignoreDuplicates: true }');
    expect(route).toContain('delivery: "queued"');
    expect(route).toContain("status: 202");
  });

  it("delivers the queued event with a stable event id and separate marketing consent", () => {
    const worker = read("src/lib/academy-integrations.server.ts");
    expect(worker).toContain('row.name === "training_waitlist_joined"');
    expect(worker).toContain('"X-Academy-Event-Id": row.id');
    expect(worker).toContain('purpose: "training_access_request"');
    expect(worker).toContain("marketing_consent: payload?.marketingConsent === true");
    expect(worker).toContain("sms_consent: false");
  });

  it("retries definite transient GHL responses but quarantines ambiguous/final outcomes", () => {
    expect(ghlDeliveryStatus({ ok: true, status: 202 }, 1)).toBe("delivered");
    expect(ghlDeliveryStatus({ ok: false, status: 429 }, 1)).toBe("retry");
    expect(ghlDeliveryStatus({ ok: false, status: 503 }, 2)).toBe("retry");
    expect(ghlDeliveryStatus({ ok: false, status: 503 }, 3)).toBe("unknown");
    expect(ghlDeliveryStatus({ ok: false, status: 400 }, 1)).toBe("unknown");
    const worker = read("src/lib/academy-integrations.server.ts");
    expect(worker).toContain("completed_at: retrying ? null");
    expect(worker).toContain("due_at: new Date(");

    expect(accessDeliveryResponseStatus({ ok: true, status: 202 }, 1)).toBe("accepted");
    expect(accessDeliveryResponseStatus({ ok: false, status: 429 }, 1)).toBe("retry");
    expect(accessDeliveryResponseStatus({ ok: false, status: 500 }, 4)).toBe("retry");
    expect(accessDeliveryResponseStatus({ ok: false, status: 500 }, 5)).toBe("unknown");
    expect(accessDeliveryFailureStatus(false, false, 4)).toBe("retry");
    expect(accessDeliveryFailureStatus(false, false, 5)).toBe("failed");
    expect(accessDeliveryFailureStatus(false, true, 5)).toBe("unknown");
    expect(accessDeliveryFailureStatus(true, false, 1)).toBe("unknown");
  });
});

describe("free-training launch claim", () => {
  it("uses the same validated media resolver as the classroom", () => {
    const media = read("src/lib/academy-media.server.ts");
    expect(media).toContain('import { slotMedia } from "./academy-content.server"');
    expect(media).toContain("slotMedia(lesson.id) !== null");
    expect(media).not.toContain("process.env[`ACADEMY_MEDIA_${l.envKey}`]");
  });
});

describe("secure integration scheduler", () => {
  it("uses pg_net with Vault-resolved capabilities and carries no literal endpoint or bearer", () => {
    const migrationDir = "supabase/migrations";
    const candidates = readdirSync(migrationDir)
      .filter((name) => name.endsWith("_secure_academy_integration_cron.sql"))
      .sort()
      .reverse();
    const secureCron = candidates
      .map((name) => read(join(migrationDir, name)))
      .find((sql) => sql.trim().length > 0);

    expect(secureCron).toBeDefined();
    expect(secureCron).toContain("SELECT net.http_post(");
    expect(secureCron).toContain("vault.decrypted_secrets");
    expect(secureCron).toContain("academy_integration_url");
    expect(secureCron).toContain("academy_scheduler_bearer");
    expect(secureCron).toContain("cron.unschedule");
    expect(secureCron).toContain("academy-process-commerce");
    expect(secureCron).toContain("academy-process-access");
    expect(secureCron).toContain("academy-process-ghl");
    expect(secureCron).toContain("'lane', %L");
    expect(secureCron).not.toContain("extensions.http_post");
    expect(secureCron).not.toMatch(/https:\/\/[^\s'\"]+/);
    expect(secureCron).not.toMatch(/'Bearer\s+[A-Za-z0-9._-]{16,}'/);
  });

  it("claims commerce receipts atomically with bounded retry and dead-letter visibility", () => {
    const migrations = readdirSync("supabase/migrations")
      .filter((name) => name.endsWith("_academy_commerce_receipt_queue.sql"))
      .map((name) => read(join("supabase/migrations", name)))
      .join("\n");
    expect(migrations).toContain("academy_claim_commerce_receipts");
    expect(migrations).toContain("FOR UPDATE SKIP LOCKED");
    expect(migrations).toContain("attempts < 5");
    expect(migrations).toContain("status IN ('pending', 'retry')");
    expect(migrations).toContain("SELECT DISTINCT ON (order_id)");
    expect(migrations).toContain("FOR UPDATE OF receipt SKIP LOCKED");
    expect(migrations).toContain("academy_claim_access_deliveries");
    const worker = read("src/lib/academy-integrations.server.ts");
    expect(worker).toContain('db.rpc("academy_claim_commerce_receipts"');
    expect(worker).toContain('status: terminal ? "failed" : "retry"');
    expect(worker).toContain('last_error: "reconciliation_failed"');
    expect(worker).toContain("const terminal = row.attempts >= 5");
    expect(worker).toContain('.eq("locked_at", row.locked_at)');
    expect(worker).toContain('.in("status", ["pending", "retry"])');
    expect(worker).toContain('.lte("received_at", lease)');
    expect(worker).toContain("COMMERCE_RECEIPT_COALESCE_FAILED");
    expect(worker.match(/p_limit: 1/g)?.length).toBe(2);
    expect(read("src/lib/academy-delivery.server.ts")).toContain(
      'db.rpc("academy_claim_access_deliveries", { p_limit: 1 })',
    );
    const commerce = read("src/lib/academy-commerce.server.ts");
    expect(commerce).toContain("const oversizedOrder = snapshot.lineItems.pageInfo.hasNextPage");
    expect(commerce).toContain("invalidPriceLines.has(grant.id) || oversizedOrder");
    expect(commerce).toContain("AbortSignal.timeout(5000)");
    expect(commerce).not.toContain("for (let page = 0; page < 20; page++)");
  });

  it("shows both queued and exception access-email states to instructors", () => {
    const server = read("src/lib/academy.server.ts");
    const studio = read("src/routes/studio.tsx");
    expect(server).toContain('["pending", "retry", "processing"]');
    expect(server).toContain("accessDeliveryQueued: accessQueued.count ?? 0");
    expect(studio).toContain('accessDeliveryQueued: "Access emails queued"');
  });

  it("permits an audited operator requeue only for a proven-unsent access failure", () => {
    const recovery = readdirSync("supabase/migrations")
      .filter((name) => name.endsWith("_academy_requeue_provably_unsent_access_delivery.sql"))
      .map((name) => read(join("supabase/migrations", name)))
      .join("\n");
    expect(recovery).toContain("send_attempted_at");
    expect(recovery).toContain("WHERE status <> 'pending'");
    expect(recovery).toContain("SET status = 'unknown'");
    expect(recovery).toContain("WHERE status IN ('retry', 'processing')");
    expect(recovery).toContain("academy_requeue_failed_access_delivery");
    expect(recovery).toContain("delivery.status IS DISTINCT FROM 'failed'");
    expect(recovery).toContain("delivery.send_attempted_at IS NOT NULL");
    expect(recovery).toContain("'access_delivery_requeued_by_operator'");
    expect(recovery).toContain("'eventId', delivery.id");
    expect(recovery).toContain(
      "GRANT EXECUTE ON FUNCTION public.academy_requeue_failed_access_delivery",
    );
    expect(recovery).toContain("TO service_role");
    expect(recovery).toContain("academy_requeue_reconciled_unknown_access_delivery");
    expect(recovery).toContain("PROVIDER_EVIDENCE_MUST_BE_12_TO_500_CHARACTERS");
    expect(recovery).toContain("academy.reviewed_access_delivery_recovery_id");
    expect(recovery).toContain("OLD.status IN ('accepted', 'unknown', 'cancelled', 'failed')");
    expect(recovery).toContain("delivery.status IS DISTINCT FROM 'unknown'");
    expect(recovery).toContain("'access_delivery_unknown_reconciled_by_operator'");

    const server = read("src/lib/academy.server.ts");
    const delivery = read("src/lib/academy-delivery.server.ts");
    const studio = read("src/routes/studio.tsx");
    expect(server).toContain('if (path === "access-requeue")');
    expect(server).toContain('if (path === "access-requeue-unknown")');
    expect(server).toContain("confirmedNoDelivery: z.literal(true)");
    expect(server.indexOf('if (path === "access-requeue")')).toBeLessThan(
      server.indexOf("requeueFailedAccessDelivery(d.deliveryId, user.id)"),
    );
    expect(delivery).toContain("send_attempted_at: sendAttemptedAt");
    expect(delivery).toContain('.eq("locked_at", lease)');
    expect(studio).toContain("Requeue proven-unsent email");
    expect(studio).toContain("Requeue reconciled unknown");
    expect(studio).toContain("I confirmed in GHL that no workflow action or message exists.");
    expect(studio).toContain("Reconcile in GHL — do not resend");
  });

  it("normalizes stored JSON before watch, reminder, or Studio use", () => {
    const server = read("src/lib/academy.server.ts");
    const worker = read("src/lib/academy-integrations.server.ts");
    expect(server).toContain("function normalizeProgress(");
    expect(server).toContain("workbook: progressWorkbook(submission.workbook)");
    expect(server).toContain("return row ? normalizeProgress(row) : null");
    expect(server).toContain("(check(r).data ?? []).map(normalizeProgress)");
    expect(worker).toContain("function validatedIntervals(");
    expect(worker).toContain('throw new Error("INVALID_PROGRESS_INTERVALS")');
  });
});

describe("runtime configuration boundary", () => {
  it("keeps tracked production configuration browser-public and local secrets ignored", () => {
    const productionKeys = read(".env.production")
      .split(/\r?\n/)
      .map((line) => line.split("=", 1)[0])
      .filter((key) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key));
    expect(productionKeys.length > 0).toBe(true);
    expect(productionKeys.every((key) => key.startsWith("VITE_"))).toBe(true);
    expect(read(".gitignore")).toContain(".env.*");
    expect(read(".gitignore")).toContain("!.env.production");
  });
});

describe("retired reservation entry", () => {
  it("routes old campaign links into the current education journey", () => {
    expect(read("src/routes/reserve/index.tsx")).toContain('throw redirect({ to: "/" })');
    for (const path of ["src/routes/reserve/vip.tsx", "src/routes/reserve/vault.tsx"]) {
      expect(read(path)).toContain('throw redirect({ to: "/summit" })');
    }
    expect(read("src/routes/vault-welcome.tsx")).toContain('throw redirect({ to: "/vault" })');
    expect(read("src/routes/checkout.tsx")).toContain('throw redirect({ to: "/summit" })');
    expect(read("src/routes/offer/vip-upgrade.tsx")).toContain('throw redirect({ to: "/summit" })');
    expect(read("src/routes/offer/implementation-vault.tsx")).toContain(
      'throw redirect({ to: "/vault" })',
    );
    expect(read("src/routes/strategy-intensive.tsx")).toContain(
      'throw redirect({ to: "/accelerator" })',
    );
  });
});

describe("unknown Shopify variants", () => {
  it("creates no grant and routes a paid zero-grant order to manual review", () => {
    const grants = reconcileLines(
      { test: false, cancelledAt: null, displayFinancialStatus: "PAID" },
      [
        {
          id: "unknown-line",
          quantity: 1,
          currentQuantity: 1,
          variant: { id: "gid://shopify/ProductVariant/99999999999999" },
        },
      ],
    );
    expect(grants).toEqual([]);

    const commerce = read("src/lib/academy-commerce.server.ts");
    expect(commerce).toContain("lineIssues.unknownPositiveLine");
    expect(commerce).toContain("p_review: needsReview");
    expect(commerce).toContain("recognizedGrants: grants.length");
  });

  it("blocks discounted or non-USD purchases from automatic access", () => {
    const line = {
      id: "ga-line",
      quantity: 1,
      currentQuantity: 1,
      variant: { id: "gid://shopify/ProductVariant/50980696129783" },
      discountedTotalSet: {
        shopMoney: { amount: "22.00", currencyCode: "USD" },
        presentmentMoney: { amount: "22.00", currencyCode: "USD" },
      },
    };
    expect(linePriceMatches(line, "50980696129783")).toBe(true);
    expect(
      linePriceMatches(
        {
          ...line,
          discountedTotalSet: {
            shopMoney: { amount: "0.00", currencyCode: "USD" },
            presentmentMoney: { amount: "0.00", currencyCode: "USD" },
          },
        },
        "50980696129783",
      ),
    ).toBe(false);
    expect(
      linePriceMatches(
        {
          ...line,
          discountedTotalSet: {
            shopMoney: { amount: "22.00", currencyCode: "USD" },
            presentmentMoney: { amount: "20.00", currencyCode: "EUR" },
          },
        },
        "50980696129783",
      ),
    ).toBe(false);
  });

  it("routes a mixed known-and-unknown paid cart to review", () => {
    const lines = [
      {
        id: "known-line",
        quantity: 1,
        currentQuantity: 1,
        variant: { id: "gid://shopify/ProductVariant/50980696129783" },
        discountedTotalSet: {
          shopMoney: { amount: "22.00", currencyCode: "USD" },
          presentmentMoney: { amount: "22.00", currencyCode: "USD" },
        },
      },
      {
        id: "unknown-line",
        quantity: 1,
        currentQuantity: 1,
        variant: { id: "gid://shopify/ProductVariant/99999999999999" },
        discountedTotalSet: {
          shopMoney: { amount: "1.00", currencyCode: "USD" },
          presentmentMoney: { amount: "1.00", currencyCode: "USD" },
        },
      },
    ];
    const grants = reconcileLines(
      { test: false, cancelledAt: null, displayFinancialStatus: "PAID" },
      lines,
    );
    expect(grants.length).toBe(1);
    expect(orderLineReviewIssues(lines, grants).unknownPositiveLine).toBe(true);
  });
});
