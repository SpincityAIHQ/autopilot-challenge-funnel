import { createFileRoute, redirect } from "@tanstack/react-router";

/** The Summit sessions now live on /summit alongside the tickets. */
export const Route = createFileRoute("/sessions")({
  beforeLoad: () => {
    throw redirect({ to: "/summit" });
  },
});
