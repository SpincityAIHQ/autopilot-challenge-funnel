import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
export const Route = createFileRoute("/api/academy/$")({
  server: {
    handlers: { GET: ({ request }) => dispatch(request), POST: ({ request }) => dispatch(request) },
  },
});
async function dispatch(request: Request) {
  const { handleAcademyGet, handleAcademyPost, AcademyError } =
    await import("@/lib/academy.server");
  try {
    const path = new URL(request.url).pathname.replace(/^\/api\/academy\//, "");
    const result =
      request.method === "GET"
        ? await handleAcademyGet(request, path)
        : await handleAcademyPost(request, path);
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof AcademyError
            ? e.message
            : e instanceof ZodError
              ? "Check the required fields and try again."
              : "This service is temporarily unavailable. Please try again.",
      },
      {
        status: e instanceof AcademyError ? e.status : e instanceof ZodError ? 400 : 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
