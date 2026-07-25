/**
 * Temporary browser-only funnel review mode.
 *
 * This lets the owner inspect every gated funnel page without payment or
 * production entitlement changes. It never writes server state, never creates
 * a registration, never unlocks paid resources, and never enables checkout.
 *
 * Review mode is available only when either:
 *   1) VITE_SUMMIT_QA_REVIEW=true, or
 *   2) the app is running on Lovable's id-preview host / localhost.
 *
 * The published autopilot-challenge-funnel.lovable.app host does not match the
 * preview-host rule, so this panel stays absent there unless an operator
 * explicitly enables the environment flag.
 */

const QA_ENV_ENABLED =
  (import.meta.env as Record<string, string | undefined>)
    .VITE_SUMMIT_QA_REVIEW === "true";

export const QA_REVIEW_STORAGE_KEY = "nuamenti:summit-qa-review-stage";
export const QA_REVIEW_QUERY_KEY = "qaStage";

export const QA_REVIEW_STAGES = {
  anonymous: [] as string[],
  ga: ["ga"],
  vip: ["ga", "vip"],
  vault: ["ga", "vip", "vault"],
  intensive: ["ga", "vip", "vault", "intensive"],
} as const;

export type QaReviewStage = keyof typeof QA_REVIEW_STAGES;

export function isQaReviewRuntimeEnabled(): boolean {
  if (QA_ENV_ENABLED) return true;
  if (typeof window === "undefined") return false;

  const host = window.location.hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("id-preview--")
  );
}

export function isQaReviewStage(value: unknown): value is QaReviewStage {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(QA_REVIEW_STAGES, value)
  );
}

export function qaScopesForStage(stage: QaReviewStage): string[] {
  return [...QA_REVIEW_STAGES[stage]];
}

export function getQaReviewStage(): QaReviewStage | null {
  if (!isQaReviewRuntimeEnabled() || typeof window === "undefined") return null;

  const requested = new URL(window.location.href).searchParams.get(
    QA_REVIEW_QUERY_KEY,
  );
  if (isQaReviewStage(requested)) {
    window.sessionStorage.setItem(QA_REVIEW_STORAGE_KEY, requested);
    return requested;
  }

  const stored = window.sessionStorage.getItem(QA_REVIEW_STORAGE_KEY);
  if (isQaReviewStage(stored)) return stored;

  // Preview opens fail-closed in the anonymous/gated state until the owner
  // intentionally selects a buyer stage.
  return "anonymous";
}

/**
 * Returns null when review mode is inactive. An empty array is a deliberate
 * anonymous review state and must be treated as a client-side QA override with
 * no scopes. This does not create a real authenticated server session.
 */
export function getQaReviewScopes(): string[] | null {
  const stage = getQaReviewStage();
  return stage === null ? null : qaScopesForStage(stage);
}

export function setQaReviewStage(stage: QaReviewStage): void {
  if (!isQaReviewRuntimeEnabled() || typeof window === "undefined") return;
  window.sessionStorage.setItem(QA_REVIEW_STORAGE_KEY, stage);
}

export function clearQaReviewStage(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(QA_REVIEW_STORAGE_KEY);
}

export function qaReviewStageLabel(stage: QaReviewStage): string {
  switch (stage) {
    case "anonymous":
      return "Anonymous / gated";
    case "ga":
      return "GA buyer";
    case "vip":
      return "VIP buyer";
    case "vault":
      return "Vault buyer";
    case "intensive":
      return "Intensive buyer";
  }
}
