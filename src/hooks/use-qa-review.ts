import { useEffect, useState } from "react";
import { isQaReviewRuntimeEnabled } from "@/lib/qa-review";

/**
 * Hydration-safe browser flag for the private/no-payment funnel walkthrough.
 * Server rendering always starts false; the private Lovable preview enables it
 * after mount. The published production host stays false unless explicitly
 * enabled by environment.
 */
export function useQaReviewMode(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isQaReviewRuntimeEnabled());
  }, []);

  return enabled;
}
