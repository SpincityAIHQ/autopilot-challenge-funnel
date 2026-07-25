/**
 * First-touch and last-touch attribution.
 *
 * Rules:
 *  - Read `ref`, `utm_source|medium|campaign|content` on every visit.
 *  - Store first-touch in localStorage on first visit; overwrite last-touch
 *    on every visit.
 *  - Attribution rows are ONLY persisted server-side after a verified
 *    Commas payment webhook (fulfillment path).
 */

const FIRST_TOUCH_KEY = "nu.attribution.first";
const LAST_TOUCH_KEY = "nu.attribution.last";

export interface AttributionTouch {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  at: string; // ISO
  landing_path: string;
}

function readParams(search: string): Partial<AttributionTouch> {
  const p = new URLSearchParams(search);
  const out: Partial<AttributionTouch> = {};
  const ref = p.get("ref");
  if (ref) out.ref = ref.slice(0, 128);
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const) {
    const v = p.get(k);
    if (v) (out as Record<string, string>)[k] = v.slice(0, 128);
  }
  return out;
}

export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  const touch: AttributionTouch = {
    ...readParams(window.location.search),
    at: new Date().toISOString(),
    landing_path: window.location.pathname,
  };
  if (!touch.ref && !touch.utm_source && !touch.utm_medium && !touch.utm_campaign && !touch.utm_content) {
    return;
  }
  try {
    if (!window.localStorage.getItem(FIRST_TOUCH_KEY)) {
      window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch));
    }
    window.localStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(touch));
  } catch {
    // localStorage unavailable — silently skip.
  }
}

export function readAttribution(): {
  first: AttributionTouch | null;
  last: AttributionTouch | null;
} {
  if (typeof window === "undefined") return { first: null, last: null };
  const parse = (raw: string | null): AttributionTouch | null => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AttributionTouch;
    } catch {
      return null;
    }
  };
  return {
    first: parse(window.localStorage.getItem(FIRST_TOUCH_KEY)),
    last: parse(window.localStorage.getItem(LAST_TOUCH_KEY)),
  };
}
