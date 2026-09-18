import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/admin/members")({
  head: () => ({
    meta: [
      { title: "Memberships — internal" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Internal." },
    ],
    links: [{ rel: "canonical", href: "/admin/members" }],
  }),
  component: AdminMembersPage,
});

type Result = { ok: true; email: string; tiers: string[]; revoked: string[] };

function AdminMembersPage() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"summit" | "accelerator" | "cancelled">("summit");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/public/admin/skool-membership", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          plan === "cancelled"
            ? { email: email.trim(), event: "cancelled" }
            : { email: email.trim(), event: "joined", plan },
        ),
      });
      if (!res.ok) {
        setMessage(await res.text());
        return;
      }
      const json = (await res.json()) as Result;
      setMessage(
        json.tiers.length
          ? `${json.email} now has: ${json.tiers.join(", ")}.`
          : `${json.email} no longer has membership access.`,
      );
    } catch {
      setMessage("That did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Memberships</h1>
      <p className="mt-2 text-sm opacity-70">
        Give or remove app access for a Skool member. Their access appears the next time they sign
        in with this exact email.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block text-sm">
          Member email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-transparent px-3 py-2"
            placeholder="name@example.com"
          />
        </label>
        <label className="block text-sm">
          Membership
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as typeof plan)}
            className="mt-1 w-full rounded-md border border-white/20 bg-transparent px-3 py-2"
          >
            <option value="summit">Summit — $97/month</option>
            <option value="accelerator">Accelerator — $555/month</option>
            <option value="cancelled">Remove membership access</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-white/90 px-4 py-2 font-medium text-black disabled:opacity-50"
        >
          {busy ? "Saving…" : "Apply"}
        </button>
      </form>
      {message ? (
        <p role="status" className="mt-6 text-sm">
          {message}
        </p>
      ) : null}
    </main>
  );
}
