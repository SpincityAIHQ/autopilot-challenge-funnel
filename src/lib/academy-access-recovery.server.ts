import { AcademyError, academyDb } from "./academy.server";

export interface RequeuedAccessDelivery {
  requeued: true;
  deliveryId: string;
  eventId: string;
  orderId: string;
  codeId: string;
  reviewerId: string;
  auditEventId: string;
}

export interface ReconciledUnknownAccessDelivery extends RequeuedAccessDelivery {
  recovery: "provider_reconciled_unknown";
}

function isRecoveryResult(
  value: unknown,
  deliveryId: string,
  reviewerId: string,
): value is RequeuedAccessDelivery {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    row.requeued === true &&
    ["deliveryId", "eventId", "orderId", "codeId", "reviewerId", "auditEventId"].every(
      (key) => typeof row[key] === "string" && row[key].length > 0,
    ) &&
    row.deliveryId === deliveryId &&
    row.eventId === deliveryId &&
    row.reviewerId === reviewerId
  );
}

function isReconciledUnknownRecoveryResult(
  value: unknown,
  deliveryId: string,
  reviewerId: string,
): value is ReconciledUnknownAccessDelivery {
  return (
    isRecoveryResult(value, deliveryId, reviewerId) &&
    (value as unknown as { recovery?: unknown }).recovery === "provider_reconciled_unknown"
  );
}

/**
 * Requeues only the database state machine's provably-unsent failed outcome.
 * The route/action calling this helper must authenticate the user and call
 * `requireInstructor(user)` before passing that user's id as `reviewerId`.
 */
export async function requeueFailedAccessDelivery(
  deliveryId: string,
  reviewerId: string,
): Promise<RequeuedAccessDelivery> {
  const db = academyDb();
  const { data, error } = await db.rpc("academy_requeue_failed_access_delivery", {
    p_delivery: deliveryId,
    p_reviewer: reviewerId,
  });

  if (error) {
    throw new AcademyError(
      error.code === "P0001" || error.code === "22023" || error.code === "22P02"
        ? "This delivery cannot be safely requeued. Reload its status and verify the order."
        : "Access-delivery recovery is temporarily unavailable.",
      error.code === "P0001" || error.code === "22023" || error.code === "22P02" ? 409 : 503,
    );
  }
  if (!isRecoveryResult(data, deliveryId, reviewerId))
    throw new AcademyError("Access-delivery recovery returned an invalid result.", 503);
  return data;
}

/**
 * Requeues an UNKNOWN outcome only after a human has reconciled the original
 * event with the provider. The route/action must call `requireInstructor(user)`
 * before passing that user's id and must supply the provider reference/evidence.
 */
export async function requeueReconciledUnknownAccessDelivery(
  deliveryId: string,
  reviewerId: string,
  providerEvidence: string,
): Promise<ReconciledUnknownAccessDelivery> {
  const evidence = providerEvidence.trim();
  if (evidence.length < 12 || evidence.length > 500)
    throw new AcademyError("Provider evidence must be between 12 and 500 characters.");

  const db = academyDb();
  const { data, error } = await db.rpc("academy_requeue_reconciled_unknown_access_delivery", {
    p_delivery: deliveryId,
    p_reviewer: reviewerId,
    p_evidence: evidence,
  });

  if (error) {
    const invalidInput = error.code === "22023" || error.code === "22P02";
    throw new AcademyError(
      invalidInput
        ? "The recovery evidence or delivery reference is invalid."
        : error.code === "P0001"
          ? "This unknown delivery cannot be safely requeued. Reload its status and verify the order."
          : "Access-delivery reconciliation is temporarily unavailable.",
      invalidInput ? 400 : error.code === "P0001" ? 409 : 503,
    );
  }
  if (!isReconciledUnknownRecoveryResult(data, deliveryId, reviewerId))
    throw new AcademyError("Access-delivery reconciliation returned an invalid result.", 503);
  return data;
}
