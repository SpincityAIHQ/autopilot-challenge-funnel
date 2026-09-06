import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/webhooks/shopify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { handleShopifyWebhook } = await import("@/lib/academy-commerce.server");
          return await handleShopifyWebhook(request);
        } catch {
          return new Response("Service unavailable", { status: 503 });
        }
      },
    },
  },
});
