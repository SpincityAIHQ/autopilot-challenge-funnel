import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/vault")({
  beforeLoad: () => { throw redirect({ to: "/offer/implementation-vault" }); },
});
