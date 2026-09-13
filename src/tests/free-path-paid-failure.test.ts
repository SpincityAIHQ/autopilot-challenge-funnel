/**
 * Behavioural proof that a paid-service failure cannot close the free room or
 * fail a completed free signup, while paid material stays strictly guarded.
 *
 * The paid entitlement lookup and the database are both faked here; no real
 * account, request or purchase is involved.
 */
import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";

const USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "learner@example.com",
  email_confirmed_at: "2026-09-01T00:00:00Z",
  app_metadata: {},
};

let failPaidLookup = true;

mock.module("../lib/academy-access.server", () => ({
  redeemedGrants: async () => {
    if (failPaidLookup) throw new Error("purchase service unavailable");
    return [];
  },
  vaultItem: () => null,
}));

function table() {
  const result = { data: null, error: null };
  const chain: Record<string, unknown> = {};
  for (const name of ["select", "eq", "order", "limit", "insert", "update", "upsert"])
    chain[name] = () => chain;
  chain.maybeSingle = async () => result;
  chain.single = async () => result;
  chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return chain;
}

mock.module("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: USER }, error: null }) },
    from: () => table(),
    rpc: async () => ({ data: true, error: null }),
    storage: { from: () => ({ download: async () => ({ data: null, error: new Error("none") }) }) },
  }),
}));

const authed = (url: string) =>
  new Request(url, { headers: { authorization: "Bearer test-token" } });

let handleAcademyGet: typeof import("../lib/academy.server").handleAcademyGet;
let handleAcademyPost: typeof import("../lib/academy.server").handleAcademyPost;
const saved: Record<string, string | undefined> = {};

beforeAll(async () => {
  for (const name of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) saved[name] = process.env[name];
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  ({ handleAcademyGet, handleAcademyPost } = await import("../lib/academy.server"));
});

afterAll(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("Free training survives a paid-service failure", () => {
  it("still opens the free lesson for a signed-in learner", async () => {
    failPaidLookup = true;
    const result = (await handleAcademyGet(
      authed("https://aiautopilotsummit.com/api/academy/lesson?lessonId=free-webinar"),
      "lesson",
    )) as { lesson: { id: string }; ticket: { code: string } };
    expect(result.lesson.id).toBe("free-webinar");
    // Personalisation falls back to the free default; nothing is granted.
    expect(result.ticket.code).toBe("SMT-FREE");
  });

  it("still completes a free signup and sends the learner to the free classroom", async () => {
    failPaidLookup = true;
    const result = (await handleAcademyPost(
      new Request("https://aiautopilotsummit.com/api/academy/register", {
        method: "POST",
        headers: { authorization: "Bearer test-token", "content-type": "application/json" },
        body: JSON.stringify({ marketingConsent: false, timezone: "America/New_York" }),
      }),
      "register",
      { marketingConsent: false, timezone: "America/New_York" },
    )) as { ok: boolean; nextPath: string };
    expect(result.ok).toBe(true);
    expect(result.nextPath).toBe("/class");
  });
});

describe("Paid lessons keep their authoritative guard", () => {
  it("refuses a paid lesson when the entitlement lookup fails", async () => {
    failPaidLookup = true;
    const attempt = handleAcademyGet(
      authed("https://aiautopilotsummit.com/api/academy/lesson?lessonId=summit-day-1"),
      "lesson",
    );
    // Fails closed: a broken purchase check never opens paid material.
    await expect(attempt).rejects.toThrow();
  });

  it("still refuses a paid lesson when the lookup works and returns no grants", async () => {
    failPaidLookup = false;
    const attempt = handleAcademyGet(
      authed("https://aiautopilotsummit.com/api/academy/lesson?lessonId=summit-day-1"),
      "lesson",
    );
    await expect(attempt).rejects.toThrow();
  });
});
