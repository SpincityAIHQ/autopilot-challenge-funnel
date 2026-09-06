import { randomUUID } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { academyDb, AcademyError } from "./academy.server";
import { redeemedGrants } from "./academy-access.server";
const API = "https://api.liveavatar.com/v1";
function bounded(value: string | undefined, fallback: number, max: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 60 ? Math.min(n, max) : fallback;
}
export function avatarSettings() {
  return {
    ready:
      process.env.ACADEMY_AVATAR_ENABLED === "true" &&
      Boolean(
        process.env.LIVEAVATAR_API_KEY &&
        process.env.LIVEAVATAR_AVATAR_ID &&
        process.env.LIVEAVATAR_VOICE_ID,
      ),
    sessionSeconds: bounded(process.env.ACADEMY_AVATAR_SESSION_SECONDS, 300, 1200),
    dailySeconds: bounded(process.env.ACADEMY_AVATAR_DAILY_SECONDS, 900, 7200),
    globalSeconds: bounded(process.env.ACADEMY_AVATAR_GLOBAL_SECONDS, 3600, 86400),
  };
}
export async function startAvatar(user: User) {
  if (!(await redeemedGrants(user, true)).includes("accelerator"))
    throw new AcademyError(
      "Live AI Spin requires active Accelerator access redeemed in this account.",
      403,
    );
  const s = avatarSettings();
  if (!s.ready)
    throw new AcademyError(
      "The live AI Spin avatar is being connected. Text chat is available.",
      503,
    );
  const id = randomUUID(),
    db = academyDb();
  const reservation = await db.rpc("academy_reserve_avatar", {
    p_id: id,
    p_user: user.id,
    p_seconds: s.sessionSeconds,
    p_daily_seconds: s.dailySeconds,
    p_global_seconds: s.globalSeconds,
  });
  if (reservation.error) throw new AcademyError("The live session could not be reserved.", 503);
  if (!reservation.data)
    throw new AcademyError(
      "A session is already open or the available session time has been used. Text chat remains available.",
      429,
    );
  let providerId: string | undefined;
  try {
    const response = await fetch(`${API}/sessions/token`, {
      method: "POST",
      headers: { "X-API-KEY": process.env.LIVEAVATAR_API_KEY!, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        mode: "FULL",
        avatar_id: process.env.LIVEAVATAR_AVATAR_ID,
        avatar_persona: { voice_id: process.env.LIVEAVATAR_VOICE_ID, language: "en" },
        interactivity_type: "PUSH_TO_TALK",
        max_session_duration: s.sessionSeconds,
      }),
    });
    if (!response.ok) throw new Error("AVATAR_PROVIDER_UNAVAILABLE");
    const value = await response.json(),
      data = value?.data;
    if (
      typeof data?.session_id !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(data.session_id) ||
      typeof data?.session_token !== "string" ||
      data.session_token.length < 20 ||
      data.session_token.length > 12000
    )
      throw new Error("AVATAR_RESPONSE_INVALID");
    providerId = data.session_id;
    const saved = await db
      .from("academy_avatar_sessions")
      .update({ provider_session_id: providerId, status: "active" })
      .eq("id", id)
      .eq("user_id", user.id);
    if (saved.error) throw new Error("AVATAR_SESSION_NOT_SAVED");
    return { id, sessionToken: data.session_token, maxSeconds: s.sessionSeconds };
  } catch {
    if (providerId) await stopProvider(providerId).catch(() => {});
    await db
      .from("academy_avatar_sessions")
      .update({ status: "unknown", ...(providerId ? { provider_session_id: providerId } : {}) })
      .eq("id", id);
    throw new AcademyError("The live avatar could not start. Text chat is still available.", 503);
  }
}
async function stopProvider(providerId: string) {
  const r = await fetch(`${API}/sessions/stop`, {
    method: "POST",
    headers: { "X-API-KEY": process.env.LIVEAVATAR_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: providerId, reason: "USER_CLOSED" }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error("AVATAR_STOP_UNCONFIRMED");
  const result = await r.json();
  if (result?.code !== 1000) throw new Error("AVATAR_STOP_UNCONFIRMED");
}
export async function stopAvatar(user: User, id: string) {
  const db = academyDb(),
    row = await db
      .from("academy_avatar_sessions")
      .select("provider_session_id,status")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
  if (row.error) throw new AcademyError("Session status could not be checked.", 503);
  if (!row.data) throw new AcademyError("Session not found.", 404);
  if (row.data.status === "ended") return { ok: true };
  try {
    if (row.data.provider_session_id) await stopProvider(row.data.provider_session_id);
    const saved = await db
      .from("academy_avatar_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (saved.error) throw saved.error;
    return { ok: true };
  } catch {
    await db.from("academy_avatar_sessions").update({ status: "unknown" }).eq("id", id);
    throw new AcademyError(
      "Your microphone is closed. Provider session closure could not be confirmed; its configured time limit remains in place.",
      503,
    );
  }
}
