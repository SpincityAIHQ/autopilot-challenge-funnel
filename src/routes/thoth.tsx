import { createFileRoute, redirect } from "@tanstack/react-router";
// Thoth is a floating helper on every page now, not a page of its own.
export const Route = createFileRoute("/thoth")({
  beforeLoad: () => {
    throw redirect({ to: "/learn" });
  },
});
