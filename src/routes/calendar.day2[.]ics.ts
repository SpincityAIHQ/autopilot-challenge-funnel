import { createFileRoute } from "@tanstack/react-router";
import { buildIcs, DAY_2 } from "@/lib/ics";

export const Route = createFileRoute("/calendar/day2.ics")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(buildIcs(DAY_2), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="autopilot-day-2.ics"',
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
