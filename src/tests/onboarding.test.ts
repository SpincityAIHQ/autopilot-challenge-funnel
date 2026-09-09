import { describe, expect, test } from "bun:test";
import { onboardingStep } from "../lib/academy-onboarding";

describe("confirmed-email classroom onboarding", () => {
  const signedIn = {
    loading: false,
    email: "learner@example.test",
    recovery: false,
    profile: null,
  };

  test("a new confirmation tab waits for the server profile check before showing choices", () => {
    expect(onboardingStep(signedIn)).toBe("checking");
    expect(onboardingStep({ ...signedIn, profile: { email: signedIn.email, registered: false } })).toBe("preferences");
  });

  test("a returning account with a profile enters without resubmitting default preferences", () => {
    expect(onboardingStep({ ...signedIn, profile: { email: signedIn.email, registered: true } })).toBe("ready");
  });

  test("an older account missing its profile receives the same explicit setup as a new buyer", () => {
    expect(onboardingStep({ ...signedIn, profile: { email: signedIn.email, registered: false } })).toBe("preferences");
  });

  test("a pending verification cannot display consent choices or enter the classroom", () => {
    expect(onboardingStep({ ...signedIn, email: null })).toBe("signed-out");
    expect(onboardingStep({ ...signedIn, loading: true, profile: { email: signedIn.email, registered: true } })).toBe("checking");
  });

  test("signing out discards a previously completed profile check", () => {
    expect(onboardingStep({ ...signedIn, email: null, profile: { email: signedIn.email, registered: true } })).toBe("signed-out");
  });

  test("an account switch cannot reuse the previous learner's profile result", () => {
    expect(onboardingStep({
      ...signedIn,
      profile: { email: "previous@example.test", registered: true },
    })).toBe("checking");
  });

  test("password recovery takes priority even when the classroom profile exists", () => {
    expect(onboardingStep({ ...signedIn, recovery: true, profile: { email: signedIn.email, registered: true } })).toBe("recovery");
    expect(onboardingStep({ ...signedIn, recovery: true, loading: true })).toBe("recovery");
  });
});
