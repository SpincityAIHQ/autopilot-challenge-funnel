import { describe, expect, it } from "vitest";
import { hashToken, generateAccessToken } from "@/lib/access-tokens.server";

describe("access token hashing", () => {
  it("hashes to 64-char hex", () => {
    const h = hashToken("hello");
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
  it("is deterministic", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });
  it("differs across inputs", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("generateAccessToken", () => {
  it("produces 43-char URL-safe base64", () => {
    const t = generateAccessToken();
    expect(t.length).toBe(43);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("produces distinct tokens", () => {
    expect(generateAccessToken()).not.toBe(generateAccessToken());
  });
});
