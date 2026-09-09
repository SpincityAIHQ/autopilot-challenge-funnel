export type OnboardingStep = "checking" | "signed-out" | "recovery" | "preferences" | "ready";
export type OnboardingProfile = { email: string; registered: boolean };

/** A server-checked profile is required before entering the classroom from /join. */
export function onboardingStep(input: {
  loading: boolean;
  email: string | null;
  recovery: boolean;
  profile: OnboardingProfile | null;
}): OnboardingStep {
  // A recovery session must never be redirected before its password is updated.
  if (input.recovery) return "recovery";
  if (input.loading) return "checking";
  if (!input.email) return "signed-out";
  // null means the authenticated server check has not succeeded yet.
  if (!input.profile || input.profile.email !== input.email) return "checking";
  return input.profile.registered ? "ready" : "preferences";
}
