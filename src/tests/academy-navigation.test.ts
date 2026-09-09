import { describe, expect, test } from "bun:test";
import {
  academyJoinDestination,
  academyJoinHref,
  academyJoinSearch,
} from "../lib/academy-navigation";

describe("classroom entry and return destinations", () => {
  test("new free-training signup returns to the classroom after verification", () => {
    const href = academyJoinHref("/class");
    const search = academyJoinSearch(Object.fromEntries(new URL(href, "https://example.test").searchParams));
    expect(search.mode).toBeUndefined();
    expect(academyJoinDestination(search.next, "/learn")).toBe("/class");
  });

  test("returning customers open sign-in and keep their intended destination", () => {
    for (const destination of ["/learn", "/summit", "/vault", "/redeem", "/book", "/ai-spin"]) {
      const href = academyJoinHref(destination, true);
      const search = academyJoinSearch(Object.fromEntries(new URL(href, "https://example.test").searchParams));
      expect(search.mode).toBe("signin");
      expect(academyJoinDestination(search.next, "/class")).toBe(destination);
    }
  });

  test("ordinary registration retains the server-selected free or paid destination", () => {
    expect(academyJoinDestination(undefined, "/class")).toBe("/class");
    expect(academyJoinDestination(undefined, "/learn")).toBe("/learn");
  });

  test("external, encoded, administrative and executable destinations never redirect students", () => {
    for (const next of [
      "https://example.test",
      "//example.test",
      "javascript:alert(1)",
      "/admin.leads",
      "/api/academy/process-integrations",
      "/redeem?code=private",
      "%2F%2Fevil.test",
      "/class/../admin",
      ["https://example.test"],
      { href: "/class" },
    ]) {
      expect(academyJoinSearch({ next }).next).toBeUndefined();
      expect(academyJoinDestination(next)).toBe("/learn");
    }
  });

  test("unknown sign-in modes and unexpected server destinations use safe defaults", () => {
    expect(academyJoinSearch({ mode: ["signin"] }).mode).toBeUndefined();
    expect(academyJoinSearch({ mode: "signup" }).mode).toBeUndefined();
    expect(academyJoinDestination(undefined, "https://example.test")).toBe("/learn");
    expect(academyJoinHref("/unknown", true)).toBe("/join?mode=signin");
  });
});

