import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site-meta";

function requestOrigin(request: Request): string {
  try {
    const url = new URL(request.url);
    return url.protocol === "https:" ? url.origin : SITE_URL;
  } catch {
    return SITE_URL;
  }
}

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = requestOrigin(request);
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /api/",
          "Disallow: /admin/",
          `Sitemap: ${origin}/sitemap.xml`,
          "",
        ].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
