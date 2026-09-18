/**
 * Skool membership → Summit access.
 *
 * Money is collected inside Skool, never in this app. When a member joins,
 * upgrades, downgrades or cancels a paid tier, Skool (through its Zapier
 * connection) posts here with a shared secret. Each membership is written as an
 * owner-grant style imported ticket in the `skool-membership` batch, so the
 * learner is recognised automatically the moment they sign in with the same
 * confirmed email.
 *
 * Only rows in the `skool-membership` batch are ever deactivated; purchased
 * tickets, the Q4 cohort grants and every other import are untouched.
 */
import { academyDb, AcademyError } from "./academy.server";

export const SKOOL_BATCH = "skool-membership";
export const SKOOL_SOURCE_KIND = "skool_membership";

/** The two paid Skool tiers and what each opens in the app. */
export const SKOOL_PLANS = {
  summit: ["ga", "vip", "vault"],
  accelerator: ["ga", "vip", "vault", "accelerator"],
} as const;
export type SkoolPlan = keyof typeof SKOOL_PLANS;

export type SkoolEvent = "joined" | "upgraded" | "downgraded" | "cancelled";

export type SkoolMembershipInput = {
  email: string;
  plan: SkoolPlan | null;
  event: SkoolEvent;
  eventId?: string | null;
};

const PLAN_ALIASES: Record<string, SkoolPlan> = {
  summit: "summit",
  "97": "summit",
  "$97": "summit",
  "97/month": "summit",
  "summit-97": "summit",
  "full summit": "summit",
  accelerator: "accelerator",
  "555": "accelerator",
  "$555": "accelerator",
  "555/month": "accelerator",
  "accelerator-555": "accelerator",
};

export function normalizePlan(raw: unknown): SkoolPlan | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  return PLAN_ALIASES[key] ?? null;
}

const EVENTS: SkoolEvent[] = ["joined", "upgraded", "downgraded", "cancelled"];
export function normalizeEvent(raw: unknown): SkoolEvent | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase().replace(/[\s_]+/g, "");
  const map: Record<string, SkoolEvent> = {
    joined: "joined", join: "joined", new: "joined", added: "joined",
    active: "joined", renewed: "joined", paid: "joined",
    upgraded: "upgraded", upgrade: "upgraded",
    downgraded: "downgraded", downgrade: "downgraded",
    cancelled: "cancelled", canceled: "cancelled", cancel: "cancelled",
    removed: "cancelled", expired: "cancelled", churned: "cancelled",
  };
  return map[key] ?? (EVENTS.includes(key as SkoolEvent) ? (key as SkoolEvent) : null);
}

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 5 || email.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function parseSkoolPayload(body: unknown): SkoolMembershipInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid payload" };
  const raw = body as Record<string, unknown>;
  const email = normalizeEmail(raw.email ?? raw.member_email ?? raw.user_email);
  if (!email) return { error: "A valid member email is required" };
  const event = normalizeEvent(raw.event ?? raw.action ?? raw.status) ?? "joined";
  const plan = normalizePlan(raw.plan ?? raw.tier ?? raw.level ?? raw.price);
  if (event !== "cancelled" && !plan)
    return { error: "Unknown membership tier. Send plan=summit or plan=accelerator." };
  const eventIdRaw = raw.eventId ?? raw.event_id ?? raw.id;
  return {
    email,
    plan: event === "cancelled" ? null : plan,
    event,
    eventId: typeof eventIdRaw === "string" ? eventIdRaw.slice(0, 200) : null,
  };
}

/** Timing-safe-enough constant-time compare for the shared secret. */
export function secretMatches(provided: string | null, expected: string | null): boolean {
  if (!expected || expected.length < 16 || !provided) return false;
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function tiersForPlan(plan: SkoolPlan | null): string[] {
  return plan ? [...SKOOL_PLANS[plan]] : [];
}

export type SkoolApplyResult = { email: string; tiers: string[]; revoked: string[] };

/**
 * Idempotent: re-running the same membership event leaves the same rows active.
 * Upgrades add tiers, downgrades and cancellations deactivate only this batch.
 */
export async function applySkoolMembership(
  input: SkoolMembershipInput,
  note = "Skool membership access. Billed in Skool; not a Summit purchase.",
): Promise<SkoolApplyResult> {
  const db = academyDb();
  const tiers = tiersForPlan(input.plan);
  const now = new Date().toISOString();

  if (tiers.length) {
    const rows = tiers.map((tier) => ({
      source_kind: SKOOL_SOURCE_KIND,
      source_key: `${SKOOL_BATCH}:${input.email}:${tier}`,
      source_batch: SKOOL_BATCH,
      source_reference: `skool ${input.plan} membership (${input.event}${input.eventId ? ` ${input.eventId}` : ""})`,
      email: input.email,
      tier,
      active: true,
      expires_at: null,
      terms_note: note,
      updated_at: now,
    }));
    const up = await db
      .from("academy_imported_tickets")
      .upsert(rows, { onConflict: "source_kind,source_key" });
    if (up.error) throw new AcademyError("Membership access could not be saved.", 503);
  }

  // Remove only this batch's rows that the current plan no longer includes.
  const stale = await db
    .from("academy_imported_tickets")
    .update({ active: false, updated_at: now })
    .eq("source_batch", SKOOL_BATCH)
    .eq("email", input.email)
    .eq("active", true)
    .not("tier", "in", `(${tiers.length ? tiers.join(",") : "__none__"})`)
    .select("tier");
  if (stale.error) throw new AcademyError("Membership access could not be updated.", 503);

  return { email: input.email, tiers, revoked: (stale.data ?? []).map((r) => r.tier as string) };
}
