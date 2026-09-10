import { academyDb } from "./academy.server";
import { emailTicketsEnabled, ticketRowsForOrder } from "./email-tickets";
import { explicitProgrammeEnd } from "./academy-access-terms.server";
/**
 * After every reconciliation, mirror the order's paid lines into the imported
 * tickets table. The purchaser opens them by choosing "Activate my purchased
 * lessons" at /redeem with a verified purchase email (claimImportedTickets);
 * nothing here grants access by itself. Refunds and cancellations flip the same
 * rows inactive. Idempotent by (source_kind, source_key).
 */
export async function syncEmailTickets(orderId: string) {
  if (!emailTicketsEnabled()) return { synced: 0 };
  const db = academyDb();
  const [order, grants] = await Promise.all([
    db.from("academy_orders").select("needs_review,email").eq("order_id", orderId).maybeSingle(),
    db.from("academy_grants").select("line_id,tier,email,active").eq("order_id", orderId),
  ]);
  if (order.error || grants.error || !order.data) throw new Error("TICKET_SYNC_UNAVAILABLE");
  const rows = ticketRowsForOrder({
    orderId,
    grants: grants.data ?? [],
    needsReview: Boolean(order.data.needs_review),
    acceleratorEndsAt: explicitProgrammeEnd(process.env.ACADEMY_ACCELERATOR_ENDS_AT),
  });
  if (!rows.length) return { synced: 0 };
  const saved = await db.from("academy_imported_tickets").upsert(
    rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
    { onConflict: "source_kind,source_key" },
  );
  if (saved.error) throw new Error("TICKET_SYNC_NOT_SAVED");
  return { synced: rows.length };
}
/**
 * Queue one transactional purchase confirmation per newly active paid line
 * (email always; SMS only when the purchaser already has an account with SMS
 * consent). The sender re-checks the order and grant before every attempt.
 */
export async function queuePurchaseConfirmations(orderId: string) {
  if (!emailTicketsEnabled()) return { queued: 0 };
  const db = academyDb();
  const [order, grants] = await Promise.all([
    db.from("academy_orders").select("needs_review,email").eq("order_id", orderId).maybeSingle(),
    db.from("academy_grants").select("line_id,tier,email,active").eq("order_id", orderId),
  ]);
  if (order.error || grants.error || !order.data) throw new Error("PURCHASE_QUEUE_UNAVAILABLE");
  if (order.data.needs_review) return { queued: 0 };
  const active = (grants.data ?? []).filter((g) => g.active && g.email.includes("@"));
  if (!active.length) return { queued: 0 };
  const profile = await db
    .from("academy_profiles")
    .select("user_id,sms_consent,phone")
    .eq("email", order.data.email)
    .maybeSingle();
  if (profile.error) throw new Error("PURCHASE_QUEUE_UNAVAILABLE");
  const rows = active.flatMap((g) => {
    const base = {
      user_id: profile.data?.user_id ?? null,
      payload: {
        orderId,
        lineId: g.line_id,
        tier: g.tier,
        email: g.email,
        purpose: "transactional",
      },
    };
    return [
      {
        ...base,
        dedup_key: `purchase-confirmed:${orderId}:${g.line_id}`,
        name: "purchase_confirmed",
      },
      ...(profile.data?.sms_consent && profile.data.phone
        ? [
            {
              ...base,
              dedup_key: `purchase-confirmed-sms:${orderId}:${g.line_id}`,
              name: "purchase_confirmed_sms",
            },
          ]
        : []),
    ];
  });
  const saved = await db
    .from("academy_outbox")
    .upsert(rows, { onConflict: "dedup_key", ignoreDuplicates: true });
  if (saved.error) throw new Error("PURCHASE_QUEUE_NOT_SAVED");
  return { queued: rows.length };
}
