import { describe, expect, test } from "bun:test";
import { learningMessageWindow } from "../lib/academy-message-window";
describe("learner-local email window", () => {
  test("nine is included and nineteen is held until the next morning", () => {
    expect(learningMessageWindow("America/New_York", new Date("2026-09-09T13:00:00Z")).allowed).toBe(true);
    const evening = learningMessageWindow("America/New_York", new Date("2026-09-09T23:00:00Z"));
    expect(evening.allowed).toBe(false);
    expect(evening.deferUntil).toBe("2026-09-10T13:00:00.000Z");
  });
  test("spring forward finds nine using the new offset", () => {
    expect(learningMessageWindow("America/New_York", new Date("2026-03-08T00:00:00Z")).deferUntil).toBe("2026-03-08T13:00:00.000Z");
  });
  test("autumn fallback finds nine using the new offset", () => {
    expect(learningMessageWindow("America/New_York", new Date("2026-11-01T00:00:00Z")).deferUntil).toBe("2026-11-01T14:00:00.000Z");
  });
  test("missing or invalid timezone stays held with an explicit reason", () => {
    expect(learningMessageWindow(null).reason).toBe("timezone_required");
    expect(learningMessageWindow("Invalid/Zone").allowed).toBe(false);
  });
});
