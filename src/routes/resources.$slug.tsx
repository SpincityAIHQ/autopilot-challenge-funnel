import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/resources/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Summit Resource Preview` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResourcePreview,
});

function ResourcePreview() {
  const { slug } = Route.useParams();
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 print:py-6">
      <p className="eyebrow">Resource preview</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        {slug.replace(/-/g, " ")}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This is a preview. The full download unlocks with your verified access
        email after registration.
      </p>
      <div className="mt-6 rounded-md border border-border p-6 text-sm text-muted-foreground print:border-0">
        <p>
          Content preview for <strong>{slug}</strong>. Print-friendly layout is
          applied automatically when you print this page.
        </p>
      </div>
      <Link
        to="/resources"
        className="mt-10 inline-block text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        ← Back to resources
      </Link>
    </main>
  );
}
