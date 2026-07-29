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

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = requestOrigin(request);
        const body = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          "  <url>",
          `    <loc>${origin}/</loc>`,
          "    <changefreq>daily</changefreq>",
          "    <priority>1.0</priority>",
          "  </url>",
          "</urlset>",
          "",
        ].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
