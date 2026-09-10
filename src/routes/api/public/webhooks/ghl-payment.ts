import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/webhooks/ghl-payment")({
  server: { handlers: { POST: async ({ request }) => {
    try {
      const { handleGhlPaymentWebhook } = await import("@/lib/academy-ghl-payments.server");
      return await handleGhlPaymentWebhook(request);
    } catch { return new Response("Service unavailable", { status: 503 }); }
  } } },
});
