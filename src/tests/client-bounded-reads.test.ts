/**
 * Hanging reads must end in a finite, retryable message instead of leaving a
 * learner on "Checking your sign-in" or "Opening your classroom" forever.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import {
  withTimeout,
  SESSION_TIMEOUT_MESSAGE,
  SESSION_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
} from "../lib/academy-client";

describe("Bounded reads", () => {
  it("ends a hanging read with a retryable message", async () => {
    const attempt = withTimeout(new Promise(() => {}), 15, SESSION_TIMEOUT_MESSAGE);
    await expect(attempt).rejects.toThrow(SESSION_TIMEOUT_MESSAGE);
    expect(SESSION_TIMEOUT_MESSAGE).toContain("refresh");
  });

  it("passes a normal answer straight through", async () => {
    expect(await withTimeout(Promise.resolve("ok"), 50, "late")).toBe("ok");
  });

  it("keeps a real rejection as itself rather than a timeout", async () => {
    const attempt = withTimeout(Promise.reject(new Error("offline")), 50, "late");
    await expect(attempt).rejects.toThrow("offline");
  });

  it("uses finite, human-scale limits", () => {
    expect(SESSION_TIMEOUT_MS).toBeGreaterThan(0);
    expect(SESSION_TIMEOUT_MS).toBeLessThanOrEqual(30000);
    expect(REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(30000);
  });
});

describe("Session state ordering and write safety", () => {
  const source = readFileSync("src/lib/academy-client.ts", "utf8");

  it("lets only the newest session read win", () => {
    expect(source).toContain("latest.current += 1");
    expect(source).toContain("seq === latest.current");
  });

  it("never retries a write automatically", () => {
    // Exactly one request is issued per call: no loop, no second attempt.
    expect(source.match(/await fetch\(/g)?.length ?? 0).toBe(1);
    expect(source).toContain("could not confirm whether that saved");
  });

  it("keeps the real auth check in place", () => {
    expect(source).toContain("supabase.auth.getSession()");
    expect(source).toContain("Authorization: `Bearer ${data.session.access_token}`");
  });
});

describe("Join countdown does not fight the user's scrolling", () => {
  const source = readFileSync("src/routes/join.tsx", "utf8");

  it("scrolls on a new message or cooldown start, not on every tick", () => {
    const effect = source.slice(source.indexOf("alertRef.current?.scrollIntoView"));
    const deps = effect.slice(effect.indexOf("}, ["), effect.indexOf("]);") + 3);
    expect(deps).toContain("feedback");
    expect(deps).toContain("emailCooldownUntil");
    // `now` and the derived per-second strings must NOT be dependencies.
    expect(deps).not.toContain("cooldownText");
    expect(deps).not.toContain("statusText");
    expect(deps).not.toContain("now");
  });

  it("keeps the per-second countdown itself", () => {
    expect(source).toContain("setNow(Date.now())");
  });
});
