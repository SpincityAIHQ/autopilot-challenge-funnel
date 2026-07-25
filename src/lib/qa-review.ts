/**
 * Temporary browser-only funnel review mode.
 *
 * This exists so the owner can inspect the exact gated funnel copy and
 * layout without making a payment or mutating production entitlements.
 * It never changes server state, never creates a registration, never unlocks
 * paid resources, and never enables a checkout URL. The mode is controlled by
 * VITE_SUMMIT_QA_REVIEW and must be turned off before launch.
 */

export const QA_REVIEW_ENABLED =
  (import.meta.env as Record<string, string | undefined>)
    .VITE_SUMMIT_QA_REVIEW === "true";

export const QA_REVIEW_STORAGE_KEY = "nuamenti:summit-qa-review-stage";

export const QA_REVIEW_STAGES = {
  anonymous: [] as string[],
  ga: ["ga"],
  vip: ["ga", "vip"],
  vault: ["ga", "vip", "vault"],
  intensive: ["ga", "vip", "vault", "intensive"],
} as const;

export type QaReviewStage = keyof typeof QA_REVIEW_STAGES;

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
  if (!QA_REVIEW_ENABLED || typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(QA_REVIEW_STORAGE_KEY);
  return isQaReviewStage(stored) ? stored : null;
}

/**
 * Returns null when review mode is inactive. An empty array is a deliberate
 * anonymous review state and must be treated as an authenticated QA override
 * with no scopes by the client-side presentation layer only.
 */
export function getQaReviewScopes(): string[] | null {
  const stage = getQaReviewStage();
  return stage ? qaScopesForStage(stage) : null;
}

export function setQaReviewStage(stage: QaReviewStage): void {
  if (!QA_REVIEW_ENABLED || typeof window === "undefined") return;
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
