import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getResourceMeta } from "@/lib/resource-metadata";

interface UnlockedContent {
  slug: string;
  tier: string;
  name: string;
  sections: { heading: string; bullets: string[] }[];
}

export const Route = createFileRoute("/resources/$slug")({
  loader: ({ params }) => {
    const r = getResourceMeta(params.slug);
    if (!r) throw notFound();
    return { slug: r.slug, tier: r.tier, name: r.name, preview: r.preview };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.name} — Summit Resource Preview`
          : "Resource — not found",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResourcePreview,
});

function ResourcePreview() {
  const meta = Route.useLoaderData();
  const [unlocked, setUnlocked] = useState<UnlockedContent | null>(null);
  const [status, setStatus] = useState<
    "idle" | "exchanging" | "loading" | "denied" | "expired" | "error"
  >("idle");

  // On mount: if ?t=magic-token is present, IMMEDIATELY strip it from
  // the visible URL (before any await, before any network call). The
  // raw token is kept only in a local variable for the exchange POST
  // and is never handed to analytics, logging, or history.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const t = url.searchParams.get("t");
    if (!t || t.length < 32 || t.length > 256) {
      // No magic token in URL — try to read directly (cookie may exist).
      loadResource();
      return;
    }
    // Strip ?t synchronously so a screenshot / logger / referer / analytics
    // beacon captured after this tick can never see it. Do this BEFORE we
    // await the exchange response.
    url.searchParams.delete("t");
    window.history.replaceState({}, "", url.toString());

    setStatus("exchanging");
    fetch("/api/public/resources/exchange", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: t }),
    })
      .then(async (res) => {
        if (res.status === 401) {
          setStatus("denied");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          return;
        }
        loadResource();
      })
      .catch(() => {
        setStatus("error");
      });
  }, [meta.slug]);

  function loadResource() {
    setStatus("loading");
    fetch("/api/public/resources/read", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: meta.slug }),
    })
      .then(async (res) => {
        if (res.status === 200) {
          const json = (await res.json()) as UnlockedContent;
          setUnlocked(json);
          setStatus("idle");
        } else if (res.status === 401) {
          setStatus("expired");
        } else if (res.status === 403) {
          setStatus("denied");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 print:py-6">
      <p className="eyebrow">Resource · {meta.tier.toUpperCase()}</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        {meta.name}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{meta.preview}</p>

      {unlocked ? (
        <section className="mt-8 space-y-6">
          {unlocked.sections.map((s) => (
            <div key={s.heading} className="surface p-5 print:border-0">
              <h2 className="font-heading text-lg text-foreground">
                {s.heading}
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {s.bullets.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : (
        <section className="mt-8 surface p-6 text-sm text-muted-foreground">
          {status === "exchanging" ? (
            <p>Verifying your one-time access link…</p>
          ) : status === "loading" ? (
            <p>Loading your resource…</p>
          ) : status === "denied" ? (
            <p>
              This session doesn't include access to this resource. If you
              believe that's wrong, write Info@NuAmenti.com.
            </p>
          ) : status === "expired" ? (
            <p>
              Your access session has expired or the magic link was already
              used. Request a fresh access email from Info@NuAmenti.com.
            </p>
          ) : status === "error" ? (
            <p>Something went wrong. Try again in a moment.</p>
          ) : (
            <p>
              This is the public preview. The full content unlocks only through
              the secure link in your access email. Reusing a magic link never
              unlocks anything.
            </p>
          )}
        </section>
      )}

      <Link
        to="/resources"
        className="mt-10 inline-block text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        ← Back to resources
      </Link>
    </main>
  );
}
