import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/keynote")({
  beforeLoad: () => { throw redirect({ to: "/next-keynote" }); },
});
