import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";

/** Nothing the classroom waits on may hang forever behind a spinner. */
export const SESSION_TIMEOUT_MS = 12000;
export const REQUEST_TIMEOUT_MS = 20000;
export const SESSION_TIMEOUT_MESSAGE =
  "Sign-in is taking longer than expected. Check your connection and refresh this page to try again.";

/** Reject after `ms`; the underlying promise is left to settle harmlessly. */
export function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function useAcademySession() {
  const [state, setState] = useState<{
    loading: boolean;
    email: string | null;
    error: string | null;
  }>({ loading: true, email: null, error: null });
  // A later read always wins: a slow earlier one must not overwrite it.
  const latest = useRef(0);
  useEffect(() => {
    let active = true;
    const update = () => {
      const seq = (latest.current += 1);
      const fresh = () => active && seq === latest.current;
      return withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, SESSION_TIMEOUT_MESSAGE)
        .then(({ data, error }) => {
          if (fresh())
            setState({
              loading: false,
              email: data.session?.user.email ?? null,
              error: error ? "Sign-in is unavailable. Please try again." : null,
            });
        })
        .catch((error: Error) => {
          if (fresh())
            setState({
              loading: false,
              email: null,
              error:
                error.message === SESSION_TIMEOUT_MESSAGE
                  ? SESSION_TIMEOUT_MESSAGE
                  : "Sign-in is unavailable. Please try again.",
            });
        });
    };
    void update();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void update();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return state;
}
/** Honest wording for an aborted request; never a retry. */
function timeoutAware(error: unknown, isWrite: boolean): Error {
  if ((error as Error)?.name !== "AbortError") return error as Error;
  return new Error(
    isWrite
      ? "We could not confirm whether that saved. Reload the page to see the latest before trying again."
      : "This is taking longer than expected. Check your connection and try again.",
  );
}

export async function academyApi<T>(path: string, body?: unknown): Promise<T> {
  // The auth check itself is unchanged — only bounded, so a hanging read shows
  // a retryable message instead of an endless spinner.
  const { data } = await withTimeout(
    supabase.auth.getSession(),
    SESSION_TIMEOUT_MS,
    SESSION_TIMEOUT_MESSAGE,
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`/api/academy/${path}`, {
      method: body === undefined ? "GET" : "POST",
      keepalive: body !== undefined,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    clearTimeout(timer);
    throw timeoutAware(error, body !== undefined);
  }
  // The deadline stays armed until the BODY is parsed: headers can arrive
  // promptly and the body then stall forever.
  let result: { error?: string };
  try {
    result = (await response.json()) as { error?: string };
  } catch (error) {
    if ((error as Error).name === "AbortError") throw timeoutAware(error, body !== undefined);
    result = { error: "The request could not be completed." };
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result as T;
}

export type Catalogue = {
  lessons: import("./academy").LessonMeta[];
  connected: string[];
  bookingConfigured: boolean;
};
/** Public slot map: which recordings are connected. Booleans only, never URLs. */
export function useCatalogue() {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  useEffect(() => {
    let active = true;
    academyApi<Catalogue>("catalogue")
      .then((c) => {
        if (active) setCatalogue(c);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return catalogue;
}
