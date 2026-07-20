import { describe, it, expect } from "bun:test";
import { computeCountdown } from "../lib/countdown";

const TARGET = "2026-08-01T12:00:00-04:00";
const targetMs = new Date(TARGET).getTime();

describe("countdown", () => {
  it("counts down when now < target", () => {
    const c = computeCountdown(targetMs - (3 * 86400 + 2 * 3600 + 5 * 60 + 7) * 1000, TARGET);
    expect(c.started).toBe(false);
    expect(c.days).toBe(3);
    expect(c.hours).toBe(2);
    expect(c.minutes).toBe(5);
    expect(c.seconds).toBe(7);
  });

  it("returns started state after the target and does NOT reset", () => {
    const c1 = computeCountdown(targetMs, TARGET);
    const c2 = computeCountdown(targetMs + 5 * 86400 * 1000, TARGET);
    expect(c1.started).toBe(true);
    expect(c2.started).toBe(true);
    expect(c2.days).toBe(0);
  });
});
