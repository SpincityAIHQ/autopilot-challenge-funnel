import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/academy/process-integrations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { processAcademyIntegrations } = await import("@/lib/academy-integrations.server");
          return await processAcademyIntegrations(request);
        } catch {
          return new Response("Service unavailable", { status: 503 });
        }
      },
    },
  },
});
