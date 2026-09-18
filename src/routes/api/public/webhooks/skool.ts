import { createFileRoute } from "@tanstack/react-router";

/**
 * Skool membership webhook (called by Zapier from Skool).
 *
 * Auth: shared secret in the `x-skool-secret` header, compared against
 * SKOOL_WEBHOOK_SECRET. Fails closed when the secret is not configured.
 * Body: { email, plan: "summit" | "accelerator", event, eventId? }
 */
export const Route = createFileRoute("/api/public/webhooks/skool")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = new Headers({ "cache-control": "no-store", "x-robots-tag": "noindex" });
        const secret = process.env.SKOOL_WEBHOOK_SECRET ?? null;
        const mod = await import("@/lib/academy-skool.server");
        if (!mod.secretMatches(request.headers.get("x-skool-secret"), secret))
          return new Response("Unauthorized", { status: 401, headers });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400, headers });
        }
        const parsed = mod.parseSkoolPayload(body);
        if ("error" in parsed)
          return new Response(parsed.error, { status: 400, headers });

        try {
          const result = await mod.applySkoolMembership(parsed);
          return Response.json({ ok: true, ...result }, { headers });
        } catch {
          return new Response("Membership could not be applied", { status: 503, headers });
        }
      },
    },
  },
});
