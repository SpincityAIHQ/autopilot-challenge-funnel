import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";

const server = readFileSync("src/lib/academy.server.ts", "utf8");
const classroom = readFileSync("src/components/AcademyClassroom.tsx", "utf8");
const player = readFileSync("src/components/VimeoLessonPlayer.tsx", "utf8");

describe("Free training does not depend on paid or optional systems", () => {
  it("authorises a free lesson without the paid entitlement lookup", () => {
    const fn = server.slice(server.indexOf("async function authorizeLesson"));
    const body = fn.slice(0, fn.indexOf("\n}"));
    expect(body.indexOf('meta.tier === "free"')).toBeLessThan(body.indexOf("grantsFor"));
  });

  it("keeps the paid entitlement guard for every other tier", () => {
    expect(server).toContain("tierAllows(await grantsFor(user), meta.tier)");
  });

  it("does not fail a classroom read when optional nurture queueing fails", () => {
    expect(server).toContain("ACADEMY_CUSTOMER_RETURN_QUEUE_FAILED");
    expect(server).not.toContain('check(await db.rpc("academy_queue_customer_return"');
  });

  it("still enforces the profile row for registration onboarding", () => {
    expect(server).toContain('if (prepared.error && path === "onboarding") check(prepared)');
  });
});

describe("Error recovery offers the right next step", () => {
  it("gives a signed-in learner a retry rather than a purchase page", () => {
    expect(classroom).toContain("Try again");
    expect(classroom).toContain('meta?.tier !== "free"');
  });
});

describe("Player surfaces its own failures", () => {
  it("subscribes to the player error event", () => {
    expect(player).toContain('"seeked", "error"');
  });

  it("drives its notes from the tested health state, not ad-hoc flags", () => {
    expect(player).toContain("createPlayerHealth");
    expect(player).not.toContain("talking.current");
  });
});
