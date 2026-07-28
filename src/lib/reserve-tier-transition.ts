/**
 * Pure tier-transition helper for the reserve funnel.
 * Never downgrades. Vault requires an already-VIP reservation.
 */
export type ReserveTier = "ga" | "ga_vip" | "ga_vip_vault";
export type UpgradeStep = "vip" | "vault";

const RANK: Record<ReserveTier, number> = {
  ga: 0,
  ga_vip: 1,
  ga_vip_vault: 2,
};

export type TransitionResult =
  | { kind: "advance"; next: ReserveTier }
  | { kind: "noop"; next: ReserveTier } // already at-or-above target
  | { kind: "vip_required" };

export function computeReserveTransition(
  current: ReserveTier,
  step: UpgradeStep,
): TransitionResult {
  if (step === "vault" && RANK[current] < RANK.ga_vip) {
    return { kind: "vip_required" };
  }
  const target: ReserveTier = step === "vip" ? "ga_vip" : "ga_vip_vault";
  if (RANK[target] > RANK[current]) return { kind: "advance", next: target };
  return { kind: "noop", next: current };
}

export function isAtOrAbove(
  observed: ReserveTier,
  target: ReserveTier,
): boolean {
  return RANK[observed] >= RANK[target];
}
