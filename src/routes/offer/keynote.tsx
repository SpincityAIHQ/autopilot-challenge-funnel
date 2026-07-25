import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/offer/keynote")({
  beforeLoad: () => {
    throw redirect({ to: "/keynote" });
  },
});
