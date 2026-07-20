import { createFileRoute } from "@tanstack/react-router";
import { buildIcs, DAY_1 } from "@/lib/ics";

export const Route = createFileRoute("/calendar/day1.ics")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(buildIcs(DAY_1), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="autopilot-day-1.ics"',
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
