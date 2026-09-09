/** Only named classroom destinations may survive authentication redirects. */
const JOIN_DESTINATIONS = new Set([
  "/class",
  "/learn",
  "/summit",
  "/vault",
  "/accelerator",
  "/redeem",
  "/book",
  "/ai-spin",
  "/thoth",
]);

export function academyJoinSearch(search: Record<string, unknown>): {
  mode?: "signin";
  next?: string;
} {
  return {
    mode: search.mode === "signin" ? "signin" : undefined,
    next: typeof search.next === "string" && JOIN_DESTINATIONS.has(search.next)
      ? search.next
      : undefined,
  };
}

export function academyJoinDestination(requested: unknown, fallback: unknown = "/learn"): string {
  if (typeof requested === "string" && JOIN_DESTINATIONS.has(requested)) return requested;
  return fallback === "/class" ? "/class" : "/learn";
}

export function academyJoinHref(destination: string, signIn = false): string {
  const search = new URLSearchParams();
  if (signIn) search.set("mode", "signin");
  if (JOIN_DESTINATIONS.has(destination)) search.set("next", destination);
  const query = search.toString();
  return query ? `/join?${query}` : "/join";
}

