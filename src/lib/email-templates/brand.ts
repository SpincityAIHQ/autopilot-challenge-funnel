/** Shared, deliberately simple email styling: green / gold / black. */
export const SITE_NAME = "AI AutoPilot Summit";
export const SITE_URL = "https://aiautopilotsummit.com";

export const BRAND = {
  black: "#0b0b0b",
  green: "#0f7a3d",
  gold: "#c9a227",
  muted: "#55575d",
  faint: "#8a8d91",
};

// Email clients need a light body even for dark-themed apps.
export const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
export const container = { padding: "24px 25px", maxWidth: "560px" };
export const h1 = {
  fontSize: "22px",
  fontWeight: "bold" as const,
  color: BRAND.black,
  margin: "0 0 8px",
};
export const rule = {
  borderTop: `3px solid ${BRAND.gold}`,
  margin: "0 0 20px",
  width: "56px",
};
export const text = {
  fontSize: "14px",
  color: BRAND.muted,
  lineHeight: "1.6",
  margin: "0 0 22px",
};
export const link = { color: BRAND.green, textDecoration: "underline" };
export const button = {
  backgroundColor: BRAND.green,
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "bold" as const,
  border: `1px solid ${BRAND.gold}`,
  borderRadius: "8px",
  padding: "12px 22px",
  textDecoration: "none",
};
export const codeStyle = {
  fontSize: "26px",
  letterSpacing: "6px",
  fontWeight: "bold" as const,
  color: BRAND.black,
  margin: "0 0 22px",
};
export const footer = { fontSize: "12px", color: BRAND.faint, margin: "28px 0 0" };
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
export const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #c9a227 !important; color: #0b0b0b !important; }
  }
  [data-ogsc] .dm-btn { background-color: #c9a227 !important; color: #0b0b0b !important; }
  [data-ogsb] .dm-btn { background-color: #c9a227 !important; color: #0b0b0b !important; }
`;
