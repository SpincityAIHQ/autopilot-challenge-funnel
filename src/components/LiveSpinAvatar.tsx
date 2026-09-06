import { useEffect, useRef, useState } from "react";
import type { SpinAvatarSession } from "@/lib/academy-liveavatar.client";
import { academyApi } from "@/lib/academy-client";
import { createClientOnlyFn } from "@tanstack/react-start";
const loadAvatarSdk = createClientOnlyFn(() => import("@/lib/academy-liveavatar.client"));
type Props = {
  settings: { eligible: boolean; ready: boolean; sessionSeconds: number; dailySeconds: number };
  answer: string;
  canAsk: boolean;
  busy: boolean;
  onTranscript: (text: string) => void;
};
function timeout<T>(p: Promise<T>, ms = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("The live connection timed out.")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
export function LiveSpinAvatar({ settings, answer, canAsk, busy, onTranscript }: Props) {
  const video = useRef<HTMLVideoElement>(null),
    active = useRef<SpinAvatarSession | null>(null),
    id = useRef<string | null>(null),
    alive = useRef(true),
    epoch = useRef(0),
    talkIntent = useRef(false),
    seen = useRef(new Set<string>()),
    handler = useRef(onTranscript),
    canAskRef = useRef(canAsk),
    busyRef = useRef(busy),
    pttStarting = useRef(false);
  const [consent, setConsent] = useState(false),
    [state, setState] = useState("closed"),
    [message, setMessage] = useState(""),
    [mic, setMic] = useState(false),
    [talking, setTalking] = useState(false);
  handler.current = onTranscript;
  canAskRef.current = canAsk;
  busyRef.current = busy;
  const closing = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  async function close() {
    if (closing.current) return;
    closing.current = true;
    epoch.current++;
    talkIntent.current = false;
    pttStarting.current = false;
    const s = active.current;
    active.current = null;
    const sessionId = id.current;
    id.current = null;
    if (timer.current) clearTimeout(timer.current);
    s?.voiceChat.stop();
    if (alive.current) {
      setState("closing");
      setMic(false);
      setTalking(false);
    }
    try {
      if (s) await timeout(s.stop(), 8000);
    } catch {}
    try {
      if (sessionId) await academyApi("avatar-stop", { id: sessionId });
    } catch (e) {
      if (alive.current) setMessage((e as Error).message);
    } finally {
      closing.current = false;
      if (alive.current) setState("closed");
    }
  }
  useEffect(() => {
    alive.current = true;
    const hide = () => {
      if (document.hidden) void close();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      alive.current = false;
      document.removeEventListener("visibilitychange", hide);
      void close();
    };
  }, []);
  useEffect(() => {
    if (!canAsk) void close();
  }, [canAsk]);
  useEffect(() => {
    if (answer && active.current && state === "active")
      try {
        active.current.speakExact(answer);
      } catch {
        setMessage("Read the text answer below while the avatar reconnects.");
      }
  }, [answer]);
  async function start() {
    if (closing.current) return;
    const run = ++epoch.current;
    setState("connecting");
    setMessage("");
    try {
      const value = await academyApi<{ id: string; sessionToken: string; maxSeconds: number }>(
        "avatar-start",
        { avatarConsent: consent },
      );
      if (!alive.current || run !== epoch.current) {
        await academyApi("avatar-stop", { id: value.id });
        return;
      }
      id.current = value.id;
      const m = await loadAvatarSdk();
      if (!alive.current || run !== epoch.current) return;
      const s = new m.SpinAvatarSession(value.sessionToken, { voiceChat: false });
      active.current = s;
      s.on(m.SessionEvent.SESSION_STREAM_READY, () => {
        if (video.current && active.current === s) s.attach(video.current);
      });
      s.on(m.SessionEvent.SESSION_DISCONNECTED, () => {
        if (active.current === s) void close();
      });
      s.on(m.AgentEventsEnum.USER_TRANSCRIPTION, (e) => {
        if (
          !alive.current ||
          active.current !== s ||
          !canAskRef.current ||
          seen.current.has(e.event_id)
        )
          return;
        seen.current.add(e.event_id);
        const text = e.text?.trim();
        if (busyRef.current) {
          setMessage("AI Spin is answering your previous question. Please wait, then ask again.");
          return;
        }
        if (text && text.length <= 1500) handler.current(text);
      });
      const starting = s.start();
      void starting
        .then(() => {
          if (!alive.current || run !== epoch.current) {
            s.voiceChat.stop();
            void s.stop();
          }
        })
        .catch(() => {});
      await timeout(starting, 25000);
      if (!alive.current || run !== epoch.current) {
        s.voiceChat.stop();
        await s.stop();
        return;
      }
      setState("active");
      timer.current = setTimeout(() => void close(), value.maxSeconds * 1000);
    } catch (e) {
      if (alive.current && run === epoch.current) {
        setMessage((e as Error).message);
        await close();
      }
    }
  }
  async function enableMic() {
    const s = active.current,
      run = epoch.current;
    if (!s) return;
    try {
      const m = await loadAvatarSdk();
      const opening = s.voiceChat.start({
        defaultMuted: true,
        mode: m.SessionInteractivityMode.PUSH_TO_TALK,
      });
      void opening
        .then(() => {
          if (!alive.current || run !== epoch.current) s.voiceChat.stop();
        })
        .catch(() => {});
      await timeout(opening);
      if (!alive.current || run !== epoch.current) {
        s.voiceChat.stop();
        return;
      }
      setMic(true);
    } catch (e) {
      s.voiceChat.stop();
      setMessage((e as Error).message);
      await close();
    }
  }
  async function toggleTalk() {
    const s = active.current;
    if (!s) return;
    if (talkIntent.current) {
      if (pttStarting.current) {
        setMessage(
          "Speaking was cancelled while the microphone connected. Start a new session to continue.",
        );
        await close();
        return;
      }
      talkIntent.current = false;
      setTalking(false);
      try {
        await s.voiceChat.mute();
        await timeout(s.voiceChat.stopPushToTalk());
      } catch (e) {
        setMessage((e as Error).message);
        await close();
      }
      return;
    }
    talkIntent.current = true;
    pttStarting.current = true;
    setTalking(true);
    try {
      const starting = s.voiceChat.startPushToTalk();
      void starting
        .then(() => {
          if (!talkIntent.current || active.current !== s) {
            void s.voiceChat.mute();
            s.voiceChat.stop();
          }
        })
        .catch(() => {});
      await timeout(starting);
      pttStarting.current = false;
      if (!talkIntent.current || active.current !== s) {
        await s.voiceChat.mute();
        return;
      }
    } catch (e) {
      pttStarting.current = false;
      s.voiceChat.stop();
      setMessage((e as Error).message);
      await close();
    }
  }
  return (
    <section className="academy-card academy-live-spin">
      <p className="academy-eyebrow">ACCELERATOR · LIVE AI AVATAR</p>
      <h2>Meet AI Spin.</h2>
      <p>
        Get a spoken explanation from Spin’s AI avatar, using the same lesson-grounded assistant as
        chat.
      </p>
      {!settings.eligible ? (
        <>
          <p>
            Live avatar help unlocks with redeemed Accelerator access. Text chat is available for
            your current lessons.
          </p>
          <a className="academy-text-button" href="/accelerator">
            Explore the Accelerator
          </a>
          <a className="academy-text-button" href="/redeem">
            Redeem an Accelerator code
          </a>
        </>
      ) : !settings.ready ? (
        <p>The live avatar is being connected. Continue with AI Spin text chat.</p>
      ) : (
        <>
          <p className="academy-muted">
            Up to {Math.floor(settings.sessionSeconds / 60)} minutes per session;{" "}
            {Math.floor(settings.dailySeconds / 60)} reserved minutes per day, subject to available
            capacity. AI Spin is an AI representation of Spin.
          </p>
          <label className="academy-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (!e.target.checked) void close();
              }}
            />
            Use HeyGen LiveAvatar to speak AI Spin’s answers. If I enable the microphone, HeyGen
            processes my audio and transcript. My full workbook is not sent to HeyGen.
          </label>
          <video
            ref={video}
            autoPlay
            playsInline
            controls
            aria-label="Live AI Spin avatar"
            hidden={state === "closed"}
          />
          {state === "closed" ? (
            <button className="academy-button" disabled={!consent || !canAsk} onClick={start}>
              Start live AI Spin
            </button>
          ) : (
            <>
              <button
                className="academy-button academy-button-secondary"
                onClick={() => void close()}
              >
                End session
              </button>
              {state === "active" && !mic ? (
                <button className="academy-text-button" onClick={enableMic}>
                  Enable microphone
                </button>
              ) : null}
              {state === "active" && mic ? (
                <>
                  <button
                    className="academy-button"
                    aria-pressed={talking}
                    disabled={!canAsk || (busy && !talking)}
                    onClick={toggleTalk}
                  >
                    {talking ? "Finish speaking" : "Start speaking"}
                  </button>
                  <button className="academy-text-button" onClick={() => void close()}>
                    End voice session
                  </button>
                </>
              ) : null}
            </>
          )}
          <p className="academy-muted">
            {state === "connecting"
              ? "Connecting…"
              : state === "active"
                ? talking
                  ? "Microphone on. Finish speaking to send your question."
                  : "Type a question below, or enable the microphone. It starts muted."
                : "Enable the chat consent below before starting a live session."}
          </p>
        </>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
