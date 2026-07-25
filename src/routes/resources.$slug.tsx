import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getResource, type ResourceContent } from "@/lib/resource-content";

export const Route = createFileRoute("/resources/$slug")({
  loader: ({ params }) => {
    const r = getResource(params.slug);
    if (!r) throw notFound();
    return {
      slug: r.slug,
      tier: r.tier,
      name: r.name,
      preview: r.preview,
    };
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
  const [token, setToken] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<ResourceContent | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "denied" | "error">(
    "idle",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t");
    if (t && t.length >= 32 && t.length <= 256) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setStatus("loading");
    fetch("/api/public/resources/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: meta.slug, token }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 200) {
          const json = (await res.json()) as ResourceContent;
          setUnlocked(json);
          setStatus("idle");
        } else if (res.status === 401 || res.status === 403) {
          setStatus("denied");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token, meta.slug]);

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
              <h2 className="font-heading text-lg text-foreground">{s.heading}</h2>
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
          {status === "loading" ? (
            <p>Verifying your access link…</p>
          ) : status === "denied" ? (
            <p>
              This access link is invalid, expired, or does not cover this
              resource. Write Info@NuAmenti.com and we'll re-issue.
            </p>
          ) : status === "error" ? (
            <p>Something went wrong. Try again in a moment.</p>
          ) : (
            <p>
              This is the public preview. The full content unlocks only through
              the secure link in your access email. URL params never unlock.
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
