import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { schedulerAuthorized } from "../lib/academy-scheduler.server";

const token = "12".repeat(32);
const digest = createHash("sha256").update(token).digest("hex");
const request = (value: string) => new Request("https://example.test/api/academy/process-integrations", {
  method: "POST",
  headers: { authorization: value },
});

describe("scheduler credential rotation", () => {
  it("accepts only the current database hash and never sends the raw credential to RPC", async () => {
    let calls = 0;
    const database = () => ({ rpc: async (name: string, args: { p_token_sha256: string }) => {
      calls++;
      expect(name).toBe("academy_scheduler_authorized");
      expect(args.p_token_sha256).not.toBe(token);
      return { data: args.p_token_sha256 === digest, error: null };
    } });
    expect(await schedulerAuthorized(request(`Bearer ${token}`), database)).toBe(true);
    expect(await schedulerAuthorized(request(`Bearer ${"34".repeat(32)}`), database)).toBe(false);
    expect(calls).toBe(2);
  });

  it("rejects malformed authorization without touching the database", async () => {
    const database = () => { throw new Error("Must not call the database"); };
    for (const value of ["", token, `Basic ${token}`, `Bearer ${token}extra`, "Bearer short"])
      expect(await schedulerAuthorized(request(value), database)).toBe(false);
  });

  it("does not trust the legacy environment credential and fails closed on DB errors", async () => {
    const previous = process.env.ACADEMY_SCHEDULER_SECRET;
    try {
      process.env.ACADEMY_SCHEDULER_SECRET = token;
      expect(await schedulerAuthorized(request(`Bearer ${token}`), () => ({
        rpc: async () => ({ data: false, error: null }),
      }))).toBe(false);
      expect(await schedulerAuthorized(request(`Bearer ${token}`), () => ({
        rpc: async () => ({ data: true, error: { message: "unavailable" } }),
      }))).toBe(false);
      expect(await schedulerAuthorized(request(`Bearer ${token}`), () => ({
        rpc: async () => { throw new Error("network unavailable"); },
      }))).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.ACADEMY_SCHEDULER_SECRET;
      else process.env.ACADEMY_SCHEDULER_SECRET = previous;
    }
  });
});
