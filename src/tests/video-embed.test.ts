import { describe, it, expect } from "bun:test";
import {
  configureVideoPlayback,
  normalizeVideoEmbedUrl,
} from "../lib/video-embed";

describe("video embed normalization — allowlist / fail closed", () => {
  it("normalizes youtube watch URLs to embed", () => {
    expect(
      normalizeVideoEmbedUrl(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      ),
    ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });
  it("normalizes youtu.be short URLs", () => {
    expect(normalizeVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });
  it("passes through embed URLs", () => {
    expect(
      normalizeVideoEmbedUrl(
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
      ),
    ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });
  it("normalizes vimeo URLs", () => {
    expect(normalizeVideoEmbedUrl("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
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

describe("funnel autoplay configuration", () => {
  it("adds muted inline autoplay to YouTube while keeping controls", () => {
    const result = configureVideoPlayback(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      { autoplay: true, muted: true, playsInline: true },
    );
    const url = new URL(result);
    expect(url.searchParams.get("autoplay")).toBe("1");
    expect(url.searchParams.get("mute")).toBe("1");
    expect(url.searchParams.get("playsinline")).toBe("1");
    expect(url.searchParams.get("controls")).toBe("1");
  });

  it("adds muted inline autoplay to Vimeo", () => {
    const result = configureVideoPlayback(
      "https://player.vimeo.com/video/123456789",
      { autoplay: true, muted: true, playsInline: true },
    );
    const url = new URL(result);
    expect(url.searchParams.get("autoplay")).toBe("1");
    expect(url.searchParams.get("muted")).toBe("1");
    expect(url.searchParams.get("playsinline")).toBe("1");
    expect(url.searchParams.get("autopause")).toBe("0");
  });
});
