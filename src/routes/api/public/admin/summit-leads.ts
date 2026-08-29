import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";
import {
  collapseLeads,
  filterLeads,
  latestConsentEvidenceByEmail,
  leadsToCsv,
  type MarketingConsentRow,
  type ReservationRow,
} from "@/lib/leads";

/**
 * Owner-only reservation lead list. Same-origin, no-store, DB rate-limited.
 * Owner scope: the current resource-session buyer_email must match one of
 * SUMMIT_OWNER_EMAILS (comma-separated, case-insensitive, server-only).
 *
 * Rows are collapsed to one per email: highest tier reached, earliest
 * first contact. ?format=csv streams the same filtered rows as CSV.
 * Filters: ?q=<search> &tier=ga|ga_vip|ga_vip_vault &sort=newest|oldest
 */

const SESSION_COOKIE = "summit_rs";
const CONSENT_PAGE_SIZE = 500;

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
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
          const exportedEmails = new Set(filtered.map((lead) => lead.email));
          const consentRows: MarketingConsentRow[] = [];

          if (exportedEmails.size > 0) {
            for (let offset = 0; ; offset += CONSENT_PAGE_SIZE) {
              const { data: consentPage, error: consentError } = await supabaseAdmin
                .from("marketing_consents")
                .select(
                  "id, subject_email, channel, granted, granted_at, revoked_at, source, source_route, copy_version, created_at, signer_name, phone",
                )
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .range(offset, offset + CONSENT_PAGE_SIZE - 1);
              if (consentError) return respond(500, "Server error");

              const page = (consentPage ?? []) as MarketingConsentRow[];
              for (const row of page) {
                if (exportedEmails.has(row.subject_email.trim().toLowerCase())) {
                  consentRows.push(row);
                }
              }
              if (page.length < CONSENT_PAGE_SIZE) break;
            }
          }

          const h = noStore("text/csv; charset=utf-8");
          h.set(
            "content-disposition",
            `attachment; filename="summit-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
          );
          return new Response(leadsToCsv(filtered, latestConsentEvidenceByEmail(consentRows)), {
            status: 200,
            headers: h,
          });
        }

        return respond(
          200,
          JSON.stringify({
            total: leads.length,
            shown: filtered.length,
            tiers: {
              ga: leads.filter((l) => l.tier_reserved === "ga").length,
              ga_vip: leads.filter((l) => l.tier_reserved === "ga_vip").length,
              ga_vip_vault: leads.filter((l) => l.tier_reserved === "ga_vip_vault").length,
            },
            leads: filtered,
          }),
          "application/json",
        );
      },
    },
  },
});
