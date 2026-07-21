import { describe, expect, it } from "bun:test";
import { getSafeHeyGenEmbed } from "../components/AiSpinAvatar";

describe("AI Spin LiveAvatar embed allowlist", () => {
  it("accepts the current short-lived LiveAvatar embed host", () => {
    expect(
      getSafeHeyGenEmbed("https://embed.liveavatar.com/v1/session_abc"),
    ).toBe("https://embed.liveavatar.com/v1/session_abc");
  });

  it("keeps the legacy HeyGen labs host compatible", () => {
    expect(
      getSafeHeyGenEmbed("https://labs.heygen.com/interactive-avatar"),
    ).toBe("https://labs.heygen.com/interactive-avatar");
  });

  it("rejects unsafe schemes, credentials, paths, and lookalike hosts", () => {
    expect(
      getSafeHeyGenEmbed("http://embed.liveavatar.com/v1/session_abc"),
    ).toBeNull();
    expect(
      getSafeHeyGenEmbed(
        "https://user:pass@embed.liveavatar.com/v1/session_abc",
      ),
    ).toBeNull();
    expect(
      getSafeHeyGenEmbed("https://embed.liveavatar.com/not-v1/x"),
    ).toBeNull();
    expect(
      getSafeHeyGenEmbed("https://embed.liveavatar.com.evil.example/v1/x"),
    ).toBeNull();
    expect(getSafeHeyGenEmbed(undefined)).toBeNull();
  });
});
