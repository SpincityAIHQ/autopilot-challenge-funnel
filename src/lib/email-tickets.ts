/**
 * Live Shopify purchases become email-matched tickets, the same table and
 * activation path as the historical Summit purchasers: the purchaser creates or
 * signs in to an account with the purchase email, verifies it, and chooses
 * "Activate my purchased lessons" at /redeem. No purchase code to type, no
 * invented access duration.
 */
export type GrantLine = { line_id: string; tier: string; email: string; active: boolean };
export type TicketRow = {
  source_kind: "shopify_order";
  source_key: string;
  source_batch: string;
  source_reference: string;
  email: string;
  tier: string;
  active: boolean;
  terms_note: string;
  expires_at: string | null;
};
export const TICKET_TERMS_NOTE =
  "Live Shopify purchase. Ticket matched to the purchase email; access follows the product terms shown at checkout and ends if the order is refunded or cancelled.";
/**
 * One ticket per paid line. Accelerator tickets need a fixed programme end
 * (ACADEMY_ACCELERATOR_ENDS_AT); without it the Accelerator line is skipped so
 * no open-ended Accelerator access is ever created by accident.
 */
export function ticketRowsForOrder(input: {
  orderId: string;
  grants: GrantLine[];
  needsReview: boolean;
  acceleratorEndsAt?: string | null;
  batch?: string;
}): TicketRow[] {
  const ends = input.acceleratorEndsAt ? Date.parse(input.acceleratorEndsAt) : NaN;
  const acceleratorEnd =
    Number.isFinite(ends) && ends > Date.now() ? new Date(ends).toISOString() : null;
  return input.grants.flatMap((g) => {
    const email = g.email.trim().toLowerCase();
    if (!email.includes("@")) return [];
    if (g.tier === "accelerator" && !acceleratorEnd) return [];
    return [
      {
        source_kind: "shopify_order" as const,
        source_key: `${input.orderId}:${g.line_id}`,
        source_batch: input.batch ?? "shopify-live",
        source_reference: input.orderId,
        email,
        tier: g.tier,
        active: g.active && !input.needsReview,
        terms_note: TICKET_TERMS_NOTE,
        expires_at: g.tier === "accelerator" ? acceleratorEnd : null,
      },
    ];
  });
}
export function emailTicketsEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.ACADEMY_EMAIL_TICKETS_ENABLED === "true";
}
export const TIER_LABELS: Record<string, string> = {
  ga: "General Admission",
  vip: "Summit + VIP",
  vault: "Emerald Vault Key",
  accelerator: "Autopilot Accelerator",
};
