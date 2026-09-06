export const FALLBACK_SITE_URL = "https://aiautopilotsummit.com";
export const SOCIAL_IMAGE_PATH = "/og-ai-autopilot-summit.png";
export const SUMMIT_TITLE = "AI AutoPilot | Free Webinar, Summit & Learning";
export const SUMMIT_DESCRIPTION =
  "Learn to build an accountable AI team around your business. Start with the free webinar, apply the lessons and explore the AI AutoPilot Summit recordings.";
export const SOCIAL_IMAGE_ALT =
  "SpinCityHQ and NuAmenti present the AI AutoPilot 2-Day Summit, live online August 29–30, 2026.";

type ImportMetaWithEnv = ImportMeta & {
  env?: Record<string, string | undefined>;
};

export function normalizePublicSiteUrl(candidate: string | undefined): string {
  if (!candidate) return FALLBACK_SITE_URL;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password) {
      return FALLBACK_SITE_URL;
    }
    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

const configuredSiteUrl = (import.meta as ImportMetaWithEnv).env?.VITE_PUBLIC_SITE_URL;

export const SITE_URL = normalizePublicSiteUrl(configuredSiteUrl);
export const CANONICAL_HOME_URL = `${SITE_URL}/`;
export const SOCIAL_IMAGE_URL = `${SITE_URL}${SOCIAL_IMAGE_PATH}`;

export function absoluteSiteUrl(path = "/"): string {
  return new URL(path, CANONICAL_HOME_URL).toString();
}
