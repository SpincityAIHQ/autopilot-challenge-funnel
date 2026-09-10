import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/checkout/$tier")({
  server: { handlers: { GET: async ({ params }) => {
    const { academyCheckoutUrl } = await import("@/lib/academy-checkout.server");
    const url = academyCheckoutUrl(params.tier);
    if (!url) return new Response("Checkout is being connected. Please return to the Summit and try again shortly.", {
      status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } });
  } } },
});
