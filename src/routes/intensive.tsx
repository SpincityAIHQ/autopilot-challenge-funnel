import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/intensive")({
  beforeLoad: () => { throw redirect({ to: "/strategy-intensive" }); },
});
