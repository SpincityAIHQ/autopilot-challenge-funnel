import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/mentorship")({
  beforeLoad: () => { throw redirect({ to: "/apply/mentorship" }); },
});
