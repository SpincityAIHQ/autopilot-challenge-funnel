import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";

/**
 * Owner-only reservation lead list. Same-origin, no-store, DB rate-limited.
 * Owner scope: the current resource-session buyer_email must match one of
 * SUMMIT_OWNER_EMAILS (comma-separated, case-insensitive, server-only).
 *
 * Rows are collapsed to one per email: highest tier reached, earliest
 * contact date, most recent activity date.
 *
 * ?format=csv streams the same filtered rows as CSV.
 * Filters: ?q=<search> &tier=ga|ga_vip|ga_vip_vault &sort=newest|oldest
 */

const SESSION_COOKIE = "summit_rs";

function noStore(contentType?: string): Headers {
  const h = new Headers({
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow",
  });
  if (contentType) h.set("content-type", contentType);
  return h;
}

function respond(status: number, body: string, contentType?: string): Response {
  return new Response(body, { status, headers: noStore(contentType) });
}

type TierReserved = "ga" | "ga_vip" | "ga_vip_vault";

const TIER_RANK: Record<TierReserved, number> = {
  ga: 1,
  ga_vip: 2,
  ga_vip_vault: 3,
};

interface ReservationRow {
  first_name: string | null;
  email: string | null;
  phone: string | null;
  tier_reserved: string;
  settled: boolean;
  created_at: string;
}

export interface Lead {
  first_name: string;
  email: string;
  phone: string;
  tier_reserved: TierReserved;
  settled: boolean;
  first_seen: string;
  last_seen: string;
  touches: number;
}

function normalizeTier(v: string): TierReserved {
  return v === "ga_vip" || v === "ga_vip_vault" ? v : "ga";
}

function csvEscape(v: string | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function collapseLeads(rows: ReservationRow[]): Lead[] {
  const byEmail = new Map<string, Lead>();
  for (const r of rows) {
    const email = (r.email ?? "").trim().toLowerCase();
    if (!email) continue;
    const tier = normalizeTier(r.tier_reserved);
    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, {
        first_name: (r.first_name ?? "").trim(),
        email,
        phone: (r.phone ?? "").trim(),
        tier_reserved: tier,
        settled: r.settled,
        first_seen: r.created_at,
        last_seen: r.created_at,
        touches: 1,
      });
      continue;
    }
    existing.touches += 1;
    if (TIER_RANK[tier] > TIER_RANK[existing.tier_reserved]) {
      existing.tier_reserved = tier;
    }
    if (r.settled) existing.settled = true;
    if (r.created_at < existing.first_seen) existing.first_seen = r.created_at;
    if (r.created_at > existing.last_seen) {
      existing.last_seen = r.created_at;
      if (r.first_name?.trim()) existing.first_name = r.first_name.trim();
      if (r.phone?.trim()) existing.phone = r.phone.trim();
    }
  }
  return [...byEmail.values()];
}

export function filterLeads(
  leads: Lead[],
  opts: { q?: string; tier?: string; sort?: string },
): Lead[] {
  const q = (opts.q ?? "").trim().toLowerCase();
  const tier = opts.tier ?? "";
  let out = leads;
  if (tier === "ga" || tier === "ga_vip" || tier === "ga_vip_vault") {
    out = out.filter((l) => l.tier_reserved === tier);
  }
  if (q) {
    out = out.filter(
      (l) =>
        l.first_name.toLowerCase().includes(q) ||
        l.email.includes(q) ||
        l.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "\u0000") ||
        l.phone.toLowerCase().includes(q),
    );
  }
  const asc = opts.sort === "oldest";
  return [...out].sort((a, b) =>
    asc
      ? a.first_seen.localeCompare(b.first_seen)
      : b.last_seen.localeCompare(a.last_seen),
  );
}

async function verifyOwner(): Promise<boolean> {
  const ownerEnv = process.env.SUMMIT_OWNER_EMAILS ?? "";
  const owners = ownerEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (owners.length === 0) return false;
  const sessionToken = getCookie(SESSION_COOKIE);
  if (!sessionToken || sessionToken.length < 32) return false;
  const sessionHash = hashToken(sessionToken);
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin.rpc("session_active_scopes", {
    _session_hash: sessionHash,
  });
  if (error) return false;
  const row = Array.isArray(data) ? data[0] : null;
  const buyer: string | undefined = row?.buyer_email;
  if (!buyer) return false;
  return owners.includes(buyer.toLowerCase());
}

export const Route = createFileRoute("/api/public/admin/summit-leads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!assertSameOrigin(request)) return respond(403, "Forbidden");
        const rlSecret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
        if (!rlSecret) return respond(503, "Service unavailable");
        const rl = await consumeRateLimit(request, "leadsadm", 30, 60, rlSecret);
        if (!rl.ok) {
          const h = noStore();
          h.set("retry-after", String(rl.retryAfterSeconds));
          return new Response("Too many requests", { status: 429, headers: h });
        }

        if (!(await verifyOwner())) return respond(404, "Not found");

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data, error } = await supabaseAdmin
          .from("summit_reservations")
          .select("first_name, email, phone, tier_reserved, settled, created_at")
          .order("created_at", { ascending: false })
          .limit(5000);
        if (error) return respond(500, "Server error");

        const url = new URL(request.url);
        const leads = collapseLeads((data ?? []) as ReservationRow[]);
        const filtered = filterLeads(leads, {
          q: url.searchParams.get("q") ?? "",
          tier: url.searchParams.get("tier") ?? "",
          sort: url.searchParams.get("sort") ?? "newest",
        });

        if (url.searchParams.get("format") === "csv") {
          const lines = [
            [
              "first_name",
              "email",
              "phone",
              "tier_reserved",
              "settled",
              "first_seen",
              "last_seen",
              "touches",
            ].join(","),
          ];
          for (const l of filtered) {
            lines.push(
              [
                csvEscape(l.first_name),
                csvEscape(l.email),
                csvEscape(l.phone),
                csvEscape(l.tier_reserved),
                csvEscape(l.settled ? "yes" : "no"),
                csvEscape(l.first_seen),
                csvEscape(l.last_seen),
                csvEscape(String(l.touches)),
              ].join(","),
            );
          }
          const h = noStore("text/csv; charset=utf-8");
          h.set(
            "content-disposition",
            `attachment; filename="summit-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
          );
          return new Response(lines.join("\r\n"), { status: 200, headers: h });
        }

        return respond(
          200,
          JSON.stringify({
            total: leads.length,
            shown: filtered.length,
            tiers: {
              ga: leads.filter((l) => l.tier_reserved === "ga").length,
              ga_vip: leads.filter((l) => l.tier_reserved === "ga_vip").length,
              ga_vip_vault: leads.filter(
                (l) => l.tier_reserved === "ga_vip_vault",
              ).length,
            },
            leads: filtered,
          }),
          "application/json",
        );
      },
    },
  },
});
