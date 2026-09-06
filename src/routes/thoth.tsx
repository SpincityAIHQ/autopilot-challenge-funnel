import { createFileRoute } from "@tanstack/react-router";
import { GuideRoom } from "@/components/GuideRoom";
export const Route = createFileRoute("/thoth")({
  head: () => ({
    meta: [
      { title: "Thoth · Your tutor | AI AutoPilot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => <GuideRoom room="thoth" />,
});
