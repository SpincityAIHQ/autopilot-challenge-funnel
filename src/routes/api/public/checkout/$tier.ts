import { createFileRoute } from "@tanstack/react-router";

/**
 * Payments are off. Old checkout links must never open a store, so every tier
 * sends the visitor back to the Summit, which is free this week.
 */
export const Route = createFileRoute("/api/public/checkout/$tier")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 302,
          headers: { Location: "/summit", "Cache-Control": "no-store" },
        }),
    },
  },
});
