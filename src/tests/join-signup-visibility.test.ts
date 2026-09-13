import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { validateJoinForm, MIN_NEW_PASSWORD_LENGTH } from "../lib/academy-auth-feedback";
import { createJoinController, type JoinAuthClient } from "../lib/academy-join-controller";

function host(overrides: Partial<Record<string, unknown>> = {}) {
  const state = {
    busy: [] as boolean[],
    feedback: [] as unknown[],
    cooldowns: [] as Array<[number, boolean]>,
    sessions: 0,
  };
  return {
    state,
    host: {
      client: overrides.client as JoinAuthClient,
      redirectTo: () => "https://aiautopilotsummit.com/join",
      token: () => 1,
      setBusy: (b: boolean) => state.busy.push(b),
      setFeedback: (f: unknown) => state.feedback.push(f),
      applyCooldown: (s: number, a: boolean) => state.cooldowns.push([s, a]),
      setAwaitingConfirmation: () => {},
      setConfirmationHelp: () => {},
      onSession: () => {
        state.sessions += 1;
      },
    },
  };
}

const never: JoinAuthClient = {
  signInWithPassword: () => new Promise(() => {}),
  signUp: () => new Promise(() => {}),
  resend: () => new Promise(() => {}),
  resetPasswordForEmail: () => new Promise(() => {}),
  updateUser: () => new Promise(() => {}),
};

describe("Signup form validation is shown in the page", () => {
  it("names the missing email instead of failing silently", () => {
    expect(validateJoinForm("", "a-long-enough-password", "signup")?.message).toContain("email");
  });

  it("tells a signup how many more password characters are needed", () => {
    const result = validateJoinForm("buyer@example.com", "short", "signup");
    expect(result?.tone).toBe("error");
    expect(result?.message).toContain(String(MIN_NEW_PASSWORD_LENGTH));
    expect(result?.message).toContain("Create account");
  });

  it("keeps the new-password minimum at twelve characters", () => {
    expect(MIN_NEW_PASSWORD_LENGTH).toBe(12);
    expect(validateJoinForm("buyer@example.com", "a".repeat(12), "signup")).toBeNull();
  });

  it("never applies the new-password minimum to an existing sign-in", () => {
    expect(validateJoinForm("buyer@example.com", "old-short", "signin")).toBeNull();
  });

  it("rejects an incomplete address before any request is made", () => {
    expect(validateJoinForm("buyer@example", "a".repeat(12), "signup")?.tone).toBe("error");
  });
});

describe("A stalled auth request recovers instead of sticking on Working", () => {
  it("stops the busy state and explains the uncertain outcome", async () => {
    const { state, host: h } = host({ client: never });
    const controller = createJoinController(h, 20);
    await controller.signUp("buyer@example.com", "a".repeat(12));
    expect(state.busy.at(-1)).toBe(false);
    const last = state.feedback.at(-1) as { tone: string; message: string };
    expect(last.tone).toBe("error");
    // Never claims nothing happened: the request may still have been accepted.
    expect(last.message).toContain("may still have been sent");
  });

  it("releases the in-flight guard so a second attempt is possible", async () => {
    const { state, host: h } = host({ client: never });
    const controller = createJoinController(h, 20);
    await controller.signIn("buyer@example.com", "whatever");
    await controller.signIn("buyer@example.com", "whatever");
    expect(state.feedback.filter(Boolean).length).toBe(2);
  });
});

describe("Join page renders feedback with the button", () => {
  const source = readFileSync("src/routes/join.tsx", "utf8");

  it("validates in the page rather than relying on the browser bubble", () => {
    expect(source).toContain("noValidate");
    expect(source).toContain("validateJoinForm");
  });

  it("places the alert region inside the form, not only at the card foot", () => {
    const formEnd = source.indexOf("</form>");
    expect(source.slice(0, formEnd)).toContain("{alerts}");
  });
});
