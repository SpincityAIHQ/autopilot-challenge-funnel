import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FounderSeatsState =
  | { status: "loading" }
  | { status: "unknown" } // RPC unreachable — treat as fail-closed for handoff
  | { status: "ok"; remaining: number };

/**
 * Reads the safe `founder_seats_remaining()` RPC. Never exposes seat rows.
 * With the sales gate off, public copy should still say "33 seats total";
 * with sales enabled, an "unknown" state must fail Founder checkout closed.
 */
export function useFounderSeatsRemaining(): FounderSeatsState {
  const [state, setState] = useState<FounderSeatsState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("founder_seats_remaining");
        if (cancelled) return;
        if (error || typeof data !== "number" || !Number.isFinite(data)) {
          setState({ status: "unknown" });
          return;
        }
        setState({ status: "ok", remaining: Math.max(0, Math.floor(data)) });
      } catch {
        if (!cancelled) setState({ status: "unknown" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
