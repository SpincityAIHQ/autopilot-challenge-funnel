import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/offer/implementation-vault")({
  beforeLoad: () => {
    throw redirect({ to: "/vault" });
  },
});
