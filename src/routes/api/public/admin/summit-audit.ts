import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";

/**
 * Owner-only audit dashboard reader. Same-origin, no-store, DB rate-limited.
 * Owner scope: the current resource-session buyer_email must match one of
 * SUMMIT_OWNER_EMAILS (comma-separated, case-insensitive, server-only).
 * Returns aggregate counts by field, cross-tabs by entitlement tier, and
 * open-text answers (email + text + timestamp), newest first.
 *
 * ?format=csv streams the raw rows as CSV instead of JSON aggregates.
 */

const SESSION_COOKIE = "summit_rs";

function noStore(contentType?: string): Headers {
  const h = new Headers({ "cache-control": "private, no-store" });
  if (contentType) h.set("content-type", contentType);
  return h;
}

function respond(status: number, body: string, contentType?: string): Response {
  return new Response(body, { status, headers: noStore(contentType) });
}

const SELECT_FIELDS = [
  "business_type",
  "revenue_stage",
  "bottleneck",
  "team_size",
  "attendance",
  "autonomy_goal",
] as const;

type SelectField = (typeof SELECT_FIELDS)[number];

interface AuditRow {
  id: string;
  created_at: string;
  email: string;
  business_type: string | null;
  revenue_stage: string | null;
  bottleneck: string | null;
  what_stops: string | null;
  ai_tools: string[] | null;
  team_size: string | null;
  attendance: string | null;
  top_question: string | null;
  autonomy_goal: string | null;
  anything_else: string | null;
  entitlement_tier: string | null;
  verification: string | null;
}


type TierKey = "ga" | "vip" | "vault" | "none";

function tierBucket(t: string | null): TierKey {
  if (t === "vault") return "vault";
  if (t === "vip") return "vip";
  if (t === "ga") return "ga";
  return "none";
}

function csvEscape(v: string | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function verifyOwner(request: Request): Promise<boolean> {
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

export const Route = createFileRoute("/api/public/admin/summit-audit")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!assertSameOrigin(request)) return respond(403, "Forbidden");
        const rlSecret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
        if (!rlSecret) return respond(503, "Service unavailable");
        const rl = await consumeRateLimit(request, "auditadm", 30, 60, rlSecret);
        if (!rl.ok) {
          const h = noStore();
          h.set("retry-after", String(rl.retryAfterSeconds));
          return new Response("Too many requests", { status: 429, headers: h });
        }

        if (!(await verifyOwner(request))) return respond(404, "Not found");

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data, error } = await supabaseAdmin
          .from("summit_audit")
          .select(
            "id, created_at, email, business_type, revenue_stage, bottleneck, what_stops, ai_tools, team_size, attendance, top_question, autonomy_goal, anything_else, entitlement_tier, verification",
          )
          .order("created_at", { ascending: false })
          .limit(5000);


        if (error) return respond(500, "Server error");
        const rows = (data ?? []) as AuditRow[];

        const url = new URL(request.url);
        if (url.searchParams.get("format") === "csv") {
          const header = [
            "created_at",
            "email",
            "verification",
            "entitlement_tier",
            "business_type",
            "revenue_stage",
            "bottleneck",
            "team_size",
            "attendance",
            "autonomy_goal",
            "ai_tools",
            "what_stops",
            "top_question",
            "anything_else",
          ];

          const lines = [header.join(",")];
          for (const r of rows) {
            lines.push(
              [
                csvEscape(r.created_at),
                csvEscape(r.email),
                csvEscape(r.verification),
                csvEscape(r.entitlement_tier),
                csvEscape(r.business_type),
                csvEscape(r.revenue_stage),
                csvEscape(r.bottleneck),
                csvEscape(r.team_size),
                csvEscape(r.attendance),
                csvEscape(r.autonomy_goal),
                csvEscape((r.ai_tools ?? []).join("; ")),
                csvEscape(r.what_stops),
                csvEscape(r.top_question),
                csvEscape(r.anything_else),
              ].join(","),
            );
          }

          const h = noStore("text/csv; charset=utf-8");
          h.set(
            "content-disposition",
            `attachment; filename="summit-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
          );
          return new Response(lines.join("\r\n"), { status: 200, headers: h });
        }

        function aggregate(source: AuditRow[]) {
          const total = source.length;
          const tiers: Record<TierKey, number> = {
            ga: 0,
            vip: 0,
            vault: 0,
            none: 0,
          };
          const breakdowns: Record<
            string,
            Record<string, { total: number; byTier: Record<TierKey, number> }>
          > = {};
          for (const f of SELECT_FIELDS) breakdowns[f] = {};
          const aiToolsAgg: Record<
            string,
            { total: number; byTier: Record<TierKey, number> }
          > = {};
          for (const r of source) {
            const tk = tierBucket(r.entitlement_tier);
            tiers[tk] += 1;
            for (const f of SELECT_FIELDS) {
              const val = r[f as SelectField];
              if (!val) continue;
              const bucket =
                breakdowns[f][val] ??
                (breakdowns[f][val] = {
                  total: 0,
                  byTier: { ga: 0, vip: 0, vault: 0, none: 0 },
                });
              bucket.total += 1;
              bucket.byTier[tk] += 1;
            }
            if (Array.isArray(r.ai_tools)) {
              for (const tool of r.ai_tools) {
                const bucket =
                  aiToolsAgg[tool] ??
                  (aiToolsAgg[tool] = {
                    total: 0,
                    byTier: { ga: 0, vip: 0, vault: 0, none: 0 },
                  });
                bucket.total += 1;
                bucket.byTier[tk] += 1;
              }
            }
          }
          return { total, tiers, breakdowns, aiTools: aiToolsAgg };
        }

        const full = aggregate(rows);
        const sessionRows = rows.filter((r) => r.verification === "session");
        const sessionOnly = aggregate(sessionRows);
        const verification = {
          session: sessionRows.length,
          entitlement_match: rows.length - sessionRows.length,
        };

        const openText = rows
          .filter((r) => r.what_stops || r.top_question || r.anything_else)
          .map((r) => ({
            id: r.id,
            email: r.email,
            created_at: r.created_at,
            entitlement_tier: r.entitlement_tier,
            verification: r.verification,
            what_stops: r.what_stops,
            top_question: r.top_question,
            anything_else: r.anything_else,
          }));

        return respond(
          200,
          JSON.stringify({
            total: full.total,
            tiers: full.tiers,
            breakdowns: full.breakdowns,
            aiTools: full.aiTools,
            verification,
            sessionOnly,
            openText,
          }),
          "application/json",
        );

      },
    },
  },
});
