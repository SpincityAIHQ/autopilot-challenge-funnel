import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
export function useAcademySession() {
  const [state, setState] = useState<{
    loading: boolean;
    email: string | null;
    error: string | null;
  }>({ loading: true, email: null, error: null });
  useEffect(() => {
    let active = true;
    const update = () =>
      supabase.auth.getSession().then(({ data, error }) => {
        if (active)
          setState({
            loading: false,
            email: data.session?.user.email ?? null,
            error: error ? "Sign-in is unavailable. Please try again." : null,
          });
      });
    update().catch(() => {
      if (active)
        setState({
          loading: false,
          email: null,
          error: "Sign-in is unavailable. Please try again.",
        });
    });
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
export async function academyApi<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`/api/academy/${path}`, {
    method: body === undefined ? "GET" : "POST",
    keepalive: body !== undefined,
    headers: {
      "Content-Type": "application/json",
      ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response
    .json()
    .catch(() => ({ error: "The request could not be completed." }));
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result as T;
}
