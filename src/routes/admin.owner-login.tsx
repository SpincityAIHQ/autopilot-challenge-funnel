import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/admin/owner-login")({
  head: () => ({
    meta: [
      { title: "Owner login — internal" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Internal owner access." },
    ],
    links: [{ rel: "canonical", href: "/admin/owner-login" }],
  }),
  component: OwnerLoginPage,
});

function OwnerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/public/admin/owner-login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });
      if (res.ok) {
        window.location.href = "/admin/leads";
        return;
      }
      const text = await res.text().catch(() => "Login failed");
      setErrorMsg(text || "Login failed");
      setStatus("error");
    } catch {
      setErrorMsg("Network error");
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-20">
      <div className="rounded-2xl border border-[#BFA46F]/30 bg-[#131313] p-8 shadow-2xl">
        <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-white">
          Owner access
        </h1>
        <p className="mb-6 text-center text-sm text-[#A0A0A0]">
          Private leads dashboard only.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-[#D0D0D0]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#3A3A3A] bg-[#1A1A1A] px-4 py-3 text-white placeholder-[#666] outline-none focus:border-[#BFA46F] focus:ring-1 focus:ring-[#BFA46F]"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-[#D0D0D0]">
              Owner password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#3A3A3A] bg-[#1A1A1A] px-4 py-3 text-white placeholder-[#666] outline-none focus:border-[#BFA46F] focus:ring-1 focus:ring-[#BFA46F]"
              placeholder="••••••••"
              required
            />
          </div>
          {status === "error" && (
            <p className="text-sm text-red-400" aria-live="polite">
              {errorMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-gradient-to-r from-[#BFA46F] to-[#D4B87A] px-4 py-3 font-semibold text-[#0A0A0A] shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "loading" ? "Opening…" : "Open leads"}
          </button>
        </form>
      </div>
    </main>
  );
}
