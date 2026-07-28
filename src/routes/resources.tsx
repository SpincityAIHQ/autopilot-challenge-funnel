import { createFileRoute, Link } from "@tanstack/react-router";
import { listResourceMetas } from "@/lib/resource-metadata";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Summit Resources — verified access required" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Summit resources unlock only via a secure single-use link emailed after verified payment.",
      },
    ],
  }),
  component: Resources,
});

function Resources() {
  const items = listResourceMetas();
  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">Resource hub</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Verified access required
      </h1>
      <p className="mt-3 text-muted-foreground">
        Every resource below unlocks only through a secure single-use link we email you after
        verified payment. The link is single-use: after you open it, we drop a private session
        cookie so you can browse everything you actually own until it expires. Sharing a link never
        works twice.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {items.map((r) => (
          <li key={r.slug} className="surface p-4">
            <p className="label-mono">{r.tier.toUpperCase()}</p>
            <p className="mt-1 font-heading text-foreground">{r.name}</p>
            <p className="mt-2 text-xs text-muted-foreground">{r.preview}</p>
            <Link
              to="/resources/$slug"
              params={{ slug: r.slug }}
              className="mt-3 inline-block text-xs text-muted-foreground underline hover:text-foreground"
            >
              Preview outline
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-muted-foreground">
        Missing your access email? Check Promotions and Spam, then write Sebastian@spincityhq.com.
        Refunds revoke access immediately.
      </p>
    </main>
  );
}
