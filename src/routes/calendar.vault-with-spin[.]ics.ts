import { createFileRoute } from "@tanstack/react-router";
import { buildIcs, type IcsDay } from "@/lib/ics";

const OPEN_THE_VAULT: IcsDay = {
  uid: "open-the-vault-with-spin-2026-08-31@spincityhq",
  summary: "Open The Vault with Spin",
  description:
    "Live 2-hour walk-through of everything inside the Implementation Vault — how to run it, not just own it. Use the private link in your NuAmenti email.",
  dateYyyyMmDd: "20260831",
  startHHmm: "130000",
  endHHmm: "150000",
};

export const Route = createFileRoute("/calendar/vault-with-spin.ics")({
  server: {
    handlers: {
      GET: async () =>
        new Response(buildIcs(OPEN_THE_VAULT), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="open-the-vault-with-spin.ics"',
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
