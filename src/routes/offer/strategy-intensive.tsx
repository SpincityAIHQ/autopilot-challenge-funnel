import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/offer/strategy-intensive")({
  beforeLoad: () => {
    throw redirect({ to: "/intensive" });
  },
});
