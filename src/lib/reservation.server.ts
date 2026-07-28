/**
 * Server-only reservation lookup. NEVER import from a browser bundle;
 * always await import() inside a server function handler.
 *
 * The lookup returns ONLY first_name and tier state — never id, email,
 * or phone. That is the entire privacy contract of the URL flow.
 */
export interface ReservationLookup {
  first_name: string | null;
  tier_reserved: "ga" | "ga_vip" | "ga_vip_vault";
}

export async function lookupReservationByToken(
  token: string,
): Promise<ReservationLookup | null> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin
    .from("summit_reservations")
    .select("first_name, tier_reserved")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  return {
    first_name: (data.first_name as string | null) ?? null,
    tier_reserved: data.tier_reserved as ReservationLookup["tier_reserved"],
  };
}
