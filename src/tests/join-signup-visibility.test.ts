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
      setStaleFeedback: () => {},
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

describe("An interrupted request is never silently swallowed", () => {
  it("reports a neutral completion when the address changed mid-flight", async () => {
    let token = 1;
    const stale: unknown[] = [];
    const fresh: unknown[] = [];
    const cooldowns: Array<[number, boolean]> = [];
    const controller = createJoinController({
      client: {
        ...never,
        signUp: async () => {
          token = 2; // the user edited the address while the request was open
          return { data: { session: null } };
        },
      } as JoinAuthClient,
      redirectTo: () => "https://aiautopilotsummit.com/join",
      token: () => token,
      setBusy: () => {},
      setFeedback: (f) => {
        if (f) fresh.push(f);
      },
      applyCooldown: (s, a) => cooldowns.push([s, a]),
      setAwaitingConfirmation: () => {},
      setConfirmationHelp: () => {},
      setStaleFeedback: (f) => stale.push(f),
      onSession: () => {},
    });
    await controller.signUp("buyer@example.com", "a".repeat(12));
    // The provider cooldown is honoured regardless of staleness...
    expect(cooldowns).toEqual([[60, false]]);
    // ...and the outcome is reported, neutrally, instead of disappearing.
    expect(stale).toHaveLength(1);
    expect((stale[0] as { message: string }).message).toContain("earlier request has finished");
    expect((stale[0] as { message: string }).message).not.toContain("account");
    expect(fresh).toHaveLength(0);
  });

  it("applies no cooldown and never retries after a timeout", async () => {
    let calls = 0;
    const cooldowns: unknown[] = [];
    const controller = createJoinController({
      client: {
        ...never,
        signUp: () => {
          calls += 1;
          return new Promise(() => {});
        },
      } as JoinAuthClient,
      redirectTo: () => "https://aiautopilotsummit.com/join",
      token: () => 1,
      setBusy: () => {},
      setFeedback: () => {},
      applyCooldown: (s, a) => cooldowns.push([s, a]),
      setAwaitingConfirmation: () => {},
      setConfirmationHelp: () => {},
      setStaleFeedback: () => {},
      onSession: () => {},
    }, 20);
    await controller.signUp("buyer@example.com", "a".repeat(12));
    await new Promise((r) => setTimeout(r, 60));
    expect(calls).toBe(1);
    expect(cooldowns).toHaveLength(0);
  });

  it("does not let a late answer overwrite newer feedback", async () => {
    let resolve!: (v: unknown) => void;
    const feedback: unknown[] = [];
    const controller = createJoinController({
      client: {
        ...never,
        signUp: () => new Promise((r) => (resolve = r as (v: unknown) => void)),
      } as JoinAuthClient,
      redirectTo: () => "https://aiautopilotsummit.com/join",
      token: () => 1,
      setBusy: () => {},
      setFeedback: (f) => {
        if (f) feedback.push(f);
      },
      applyCooldown: () => {},
      setAwaitingConfirmation: () => {},
      setConfirmationHelp: () => {},
      setStaleFeedback: () => {},
      onSession: () => {},
    }, 20);
    await controller.signUp("buyer@example.com", "a".repeat(12)); // times out
    const afterTimeout = feedback.length;
    resolve({ data: { session: null } }); // provider answers late
    await new Promise((r) => setTimeout(r, 30));
    expect(feedback.length).toBe(afterTimeout);
  });
});

describe("Join page renders feedback with the button", () => {
  const source = readFileSync("src/routes/join.tsx", "utf8");

  it("validates in the page rather than relying on the browser bubble", () => {
    expect(source).toContain("noValidate");
    // Persistent handler in case native validation fires anywhere.
    expect(source).toContain("onInvalid");
    expect(source).toContain("validateJoinForm");
  });

  it("scrolls the message into view on a tall phone card", () => {
    expect(source).toContain("scrollIntoView");
    expect(source).toContain("alertRef");
  });

  it("places the alert region inside the form, not only at the card foot", () => {
    const start = source.indexOf("<form onSubmit={onSubmit}");
    const end = source.indexOf("</form>", start);
    expect(source.slice(start, end)).toContain("{alerts}");
  });
});
