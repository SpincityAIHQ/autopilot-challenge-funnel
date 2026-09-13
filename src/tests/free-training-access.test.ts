import { describe, it, expect, afterEach } from "bun:test";
import { readFileSync } from "node:fs";
import { handleAcademyGet } from "../lib/academy.server";
import { slotMedia } from "../lib/academy-content.server";

const FREE_URL = "https://aiautopilotsummit.com/api/academy/lesson?lessonId=free-webinar";
const CONFIGURED = "https://vimeo.com/1225785709";

function restore(value: string | undefined) {
  if (value === undefined) delete process.env.ACADEMY_VIMEO_FREE_WEBINAR;
  else process.env.ACADEMY_VIMEO_FREE_WEBINAR = value;
}

describe("Free training visibility for a signed-out visitor", () => {
  const original = process.env.ACADEMY_VIMEO_FREE_WEBINAR;
  afterEach(() => restore(original));

  it("never sends the recording to an unauthenticated request", async () => {
    process.env.ACADEMY_VIMEO_FREE_WEBINAR = CONFIGURED;
    const result = (await handleAcademyGet(new Request(FREE_URL), "lesson")) as {
      lesson: { media: unknown };
      accountRequired: boolean;
    };
    expect(result.lesson.media).toBeNull();
    expect(JSON.stringify(result)).not.toContain("player.vimeo.com");
  });

  it("reports that a free account opens the connected recording", async () => {
    process.env.ACADEMY_VIMEO_FREE_WEBINAR = CONFIGURED;
    const result = (await handleAcademyGet(new Request(FREE_URL), "lesson")) as {
      accountRequired: boolean;
    };
    expect(result.accountRequired).toBe(true);
  });

  it("does not claim a recording exists when no free slot is configured", async () => {
    delete process.env.ACADEMY_VIMEO_FREE_WEBINAR;
    delete process.env.ACADEMY_MEDIA_FREE_WEBINAR;
    expect(slotMedia("free-webinar")).toBeNull();
    const result = (await handleAcademyGet(new Request(FREE_URL), "lesson")) as {
      accountRequired: boolean;
    };
    expect(result.accountRequired).toBe(false);
  });

  it("builds the free slot from the configured Vimeo link with no hardcoded fallback", () => {
    process.env.ACADEMY_VIMEO_FREE_WEBINAR = CONFIGURED;
    const media = slotMedia("free-webinar");
    expect(media?.provider).toBe("vimeo");
    expect(media?.url).toContain("/video/1225785709");
  });
});

describe("Classroom copy for the signed-out free training visitor", () => {
  const source = readFileSync("src/components/AcademyClassroom.tsx", "utf8");

  it("offers account creation instead of claiming the recording is missing", () => {
    expect(source).toContain("Create your free account to watch");
    expect(source).toContain("accountRequired");
    expect(source).toContain("Create a free account or sign in →");
  });

  it("keeps playback and saved progress behind a signed-in session", () => {
    expect(source).toContain("media && session.email");
  });
});

describe("Player guidance when the embed never responds", () => {
  const source = readFileSync("src/components/VimeoLessonPlayer.tsx", "utf8");

  it("gives retry guidance without claiming the recording played", () => {
    expect(source).toContain("The player has not responded yet");
    expect(source).not.toContain("Playback started");
  });
});
