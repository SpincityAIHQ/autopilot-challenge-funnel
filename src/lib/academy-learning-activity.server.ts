type ActivityDatabase = {
  rpc: (name: string, args: { p_user: string }) => PromiseLike<{ error: unknown }>;
};
type VerifiedStudent = { id: string; email_confirmed_at?: string };

/** Called only with the user returned by academyUser, never a request-body identity. */
export async function recordLearningActivity(
  db: ActivityDatabase,
  user: VerifiedStudent | null,
  method: string,
  path: string,
  reportFailure: () => void = () => console.warn("LEARNING_ACTIVITY_RECORD_FAILED"),
) {
  const eligible = (method === "GET" && ["dashboard", "lesson"].includes(path)) ||
    (method === "POST" && ["tutor", "progress"].includes(path));
  if (!eligible || !user?.id || !user.email_confirmed_at) return false;
  try {
    const result = await db.rpc("academy_touch_learning_activity", { p_user: user.id });
    if (result.error) {
      reportFailure();
      return false;
    }
    return true;
  } catch {
    // An observability failure must not take the student's recording or tutor offline.
    // The safe marker exposes no question, email, user ID or provider credentials.
    reportFailure();
    return false;
  }
}
