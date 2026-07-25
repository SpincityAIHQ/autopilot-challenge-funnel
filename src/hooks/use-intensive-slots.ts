import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type IntensiveSlotsState =
  | { status: "loading" }
  | { status: "unknown" }
  | { status: "ok"; remaining: number };

/**
 * Reads the safe `intensive_slots_remaining()` RPC.
 * With the sales gate off, public copy should still say "10 slots total";
 * with sales enabled, an "unknown" state must fail the Intensive CTA closed.
 */
export function useIntensiveSlotsRemaining(): IntensiveSlotsState {
  const [state, setState] = useState<IntensiveSlotsState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("intensive_slots_remaining");
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
