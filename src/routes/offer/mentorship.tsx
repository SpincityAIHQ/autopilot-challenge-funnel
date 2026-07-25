import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/offer/mentorship")({
  beforeLoad: () => { throw redirect({ to: "/apply/mentorship" }); },
});
