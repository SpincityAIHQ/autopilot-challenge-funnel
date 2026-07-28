import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { hashToken } from "@/lib/access-tokens.server";
import { buildIcs, type IcsDay } from "@/lib/ics";

const SESSION_COOKIE = "summit_rs";

const OPEN_THE_VAULT: IcsDay = {
  uid: "open-the-vault-with-spin-2026-08-31@spincityhq",
  summary: "Secret Day 3 — Vault Opener Class with Spin",
  description:
    "Emerald-only live implementation class with Spin. Open the Vault, connect the system to your business, and work through implementation questions. Use the private link in your email from Sebastian@spincityhq.com.",
  location: "Online — use the private link in your email",
  dateYyyyMmDd: "20260831",
  startHHmm: "130000",
  endHHmm: "150000",
};

function privateResponse(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  });
}

export const Route = createFileRoute("/calendar/vault-with-spin.ics")({
  server: {
    handlers: {
      GET: async () => {
        const sessionToken = getCookie(SESSION_COOKIE);
        if (!sessionToken || sessionToken.length < 32) {
          return privateResponse(401, "Secure Emerald access required");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("session_active_scopes", {
          _session_hash: hashToken(sessionToken),
        });
        if (error) return privateResponse(500, "Server error");

        const row = Array.isArray(data) ? data[0] : null;
        const scopes: string[] =
          row && Array.isArray(row.scopes)
            ? row.scopes.filter((scope: unknown): scope is string => typeof scope === "string")
            : [];
        if (!scopes.includes("vault")) {
          return privateResponse(403, "Emerald access required");
        }

        return new Response(buildIcs(OPEN_THE_VAULT), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="open-the-vault-with-spin.ics"',
            "Cache-Control": "private, no-store",
            Vary: "Cookie",
          },
        });
      },
    },
  },
});
