import { describe, expect, it } from "bun:test";
import {
  configureVideoPlayback,
  normalizeVideoEmbedUrl,
  videoIframeSandbox,
  VIMEO_PLAYER_SANDBOX,
} from "../lib/video-embed";

describe("video embed normalization", () => {
  it("normalizes YouTube watch URLs", () => {
    expect(normalizeVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("normalizes YouTube short URLs", () => {
    expect(normalizeVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("normalizes Vimeo URLs", () => {
    expect(normalizeVideoEmbedUrl("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
    );
    expect(normalizeVideoEmbedUrl("https://vimeo.com/1213741553?share=copy&fl=sv&fe=ci")).toBe(
      "https://player.vimeo.com/video/1213741553",
    );
    expect(normalizeVideoEmbedUrl("https://vimeo.com/1213757805?share=copy&fl=sv&fe=ci")).toBe(
      "https://player.vimeo.com/video/1213757805",
    );
  });

  it("fails closed on non-allowlisted origins", () => {
    expect(normalizeVideoEmbedUrl("https://evil.example/video")).toBeNull();
    expect(normalizeVideoEmbedUrl("http://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(normalizeVideoEmbedUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeVideoEmbedUrl("")).toBeNull();
    expect(normalizeVideoEmbedUrl(null)).toBeNull();
  });
});

describe("funnel autoplay parameters", () => {
  it("requests muted inline autoplay for YouTube", () => {
    const configured = configureVideoPlayback("https://www.youtube.com/embed/dQw4w9WgXcQ", {
      autoplay: true,
      muted: true,
      playsInline: true,
    });
    const url = new URL(configured);
    expect(url.searchParams.get("autoplay")).toBe("1");
    expect(url.searchParams.get("mute")).toBe("1");
    expect(url.searchParams.get("playsinline")).toBe("1");
    expect(url.searchParams.get("controls")).toBe("1");
  });

  it("requests muted inline autoplay for Vimeo", () => {
    const configured = configureVideoPlayback("https://player.vimeo.com/video/123456789", {
      autoplay: true,
      muted: true,
      playsInline: true,
    });
    const url = new URL(configured);
    expect(url.searchParams.get("autoplay")).toBe("1");
    expect(url.searchParams.get("muted")).toBe("1");
    expect(url.searchParams.get("playsinline")).toBe("1");
    expect(url.searchParams.get("controls")).toBe("1");
  });

  it("removes Vimeo-owned outbound branding from the player", () => {
    const configured = configureVideoPlayback("https://player.vimeo.com/video/123456789", {
      autoplay: true,
      muted: true,
      playsInline: true,
    });
    const url = new URL(configured);

    expect(url.searchParams.get("title")).toBe("0");
    expect(url.searchParams.get("byline")).toBe("0");
    expect(url.searchParams.get("portrait")).toBe("0");
    expect(url.searchParams.get("badge")).toBe("0");
    expect(url.searchParams.get("vimeo_logo")).toBe("0");
    expect(url.searchParams.get("dnt")).toBe("1");
  });

  it("sandboxes Vimeo without granting popup or top-navigation access", () => {
    expect(videoIframeSandbox("https://player.vimeo.com/video/123456789")).toBe(
      VIMEO_PLAYER_SANDBOX,
    );
    expect(videoIframeSandbox("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBeUndefined();
    expect(VIMEO_PLAYER_SANDBOX).not.toContain("allow-popups");
    expect(VIMEO_PLAYER_SANDBOX).not.toContain("allow-top-navigation");
  });
});
