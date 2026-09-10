import { ghlPaymentConfiguration } from "./academy-ghl-payments.server";
const legacy: Record<string, string> = {
  ga: "https://spincityhq.com/products/ai-autopilot-summit-general-admission",
  vip: "https://spincityhq.com/products/ai-autopilot-summit-vip",
  vault: "https://spincityhq.com/products/ai-autopilot-summit-vip-emerald-vault-key",
  accelerator: "https://spincityhq.com/products/q4-ai-accelerator",
};
export function academyCheckoutUrl(tier: string, env: Record<string, string | undefined> = process.env): string | null {
  if (!Object.prototype.hasOwnProperty.call(legacy, tier)) return null;
  const provider = env.ACADEMY_CHECKOUT_PROVIDER ?? "shopify";
  if (provider === "shopify") return legacy[tier];
  if (provider !== "ghl") return null;
  try {
    const config = ghlPaymentConfiguration(env);
    if (!config.prices.some((p) => p.tier === tier)) return null;
    const links = JSON.parse(env.ACADEMY_GHL_CHECKOUT_LINKS_JSON ?? "");
    const url = new URL(links[tier]);
    const hosts = (env.ACADEMY_GHL_CHECKOUT_HOSTS ?? "").split(",").map((h) => h.trim()).filter(Boolean);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !hosts.includes(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}
