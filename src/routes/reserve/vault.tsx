import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ReserveFrame } from "@/components/reserve/ReserveFrame";
import { isValidReservationToken } from "@/lib/reservation-token";
import { getReservationByToken } from "@/lib/reservation.functions";
import { resolveReserveCheckoutUrl } from "@/lib/reserve-checkout";

const searchSchema = z.object({ t: z.string().optional() });

export const Route = createFileRoute("/reserve/vault")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Your VIP reservation — AI AutoPilot 2-Day Summit" },
      { name: "description", content: "Complete or upgrade your VIP reservation." },
      { name: "robots", content: "noindex, nofollow" },
      { httpEquiv: "Cache-Control", content: "private, no-store" },
    ],
  }),
  loaderDeps: ({ search }) => ({ t: search.t }),
  loader: async ({ deps }) => {
    if (!deps.t || !isValidReservationToken(deps.t)) {
      throw redirect({ to: "/reserve" });
    }
    const r = await getReservationByToken({ data: { token: deps.t } });
    if (!r) throw redirect({ to: "/reserve" });
    // A plain-ga token must upgrade to VIP first.
    if (r.tier_reserved === "ga") {
      throw redirect({ to: "/reserve/vip", search: { t: deps.t } });
    }
    return { first_name: r.first_name, tier: r.tier_reserved, token: deps.t };
  },
  component: ReserveVaultPage,
});

function ReserveVaultPage() {
  const { first_name, token } = Route.useLoaderData();
  const gaVipUrl = resolveReserveCheckoutUrl("ga_vip");
  const gaVipVaultUrl = resolveReserveCheckoutUrl("ga_vip_vault");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function becomeKeyHolder() {
    if (!gaVipVaultUrl) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/reserve-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, step: "vault" }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean }
        | null;
      if (!res.ok || !body?.ok) {
        setError("Couldn't upgrade the reservation. Try again.");
        return;
      }
      window.location.assign(gaVipVaultUrl);
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ReserveFrame>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:py-24">
        <p className="reserve-eyebrow reserve-gold-text text-center">
          Your VIP reservation is held
        </p>
        <h1 className="mt-3 text-center reserve-display reserve-gold-text text-3xl sm:text-[42px] leading-tight">
          VIP · Reserved
        </h1>
        {first_name ? (
          <p className="mt-4 text-center text-base sm:text-lg">
            {first_name}, nothing has been charged yet.
          </p>
        ) : null}

        <div className="mt-12 sm:mt-16 space-y-8 sm:space-y-10">
          {/* CARD A */}
          <section className="reserve-card p-6 sm:p-8">
            <p className="reserve-eyebrow reserve-gold-text">Complete your reservation</p>
            <p className="mt-3 reserve-mono-price text-[34px]" style={{ color: "#30D68B" }}>
              $99
            </p>
            <a
              href={gaVipUrl ?? "#"}
              aria-disabled={!gaVipUrl}
              onClick={(e) => { if (!gaVipUrl) e.preventDefault(); }}
              className={`mt-6 block w-full text-center rounded-xl py-4 text-base sm:text-lg reserve-gold-btn ${!gaVipUrl ? "pointer-events-none opacity-50" : ""}`}
            >
              Pay $99 Now
            </a>
            {!gaVipUrl ? (
              <p className="mt-3 text-xs opacity-70">Checkout is being configured. Please try again shortly.</p>
            ) : null}
          </section>

          <div className="flex items-center gap-4">
            <div className="reserve-hairline flex-1" />
            <span className="reserve-eyebrow reserve-gold-text">or</span>
            <div className="reserve-hairline flex-1" />
          </div>

          {/* CARD B — jewel treatment */}
          <section className="reserve-card reserve-card--emerald p-6 sm:p-8">
            <p className="reserve-eyebrow" style={{ color: "#30D68B" }}>
              Become an Emerald Vault Key Holder
            </p>
            <p className="mt-3 reserve-mono-price text-[48px] reserve-jewel">
              $298 Total
            </p>
            <p className="mt-5 text-base sm:text-lg">
              You're not getting a course about our system. You're getting our system.
              The MVP App Builder and the AI Business GPS are the actual files we run
              when we build for clients paying $20,000 and up.
            </p>
            <ul className="mt-5 space-y-2 text-base sm:text-lg">
              <li>• MVP App Builder</li>
              <li>• AI Business GPS</li>
              <li>• 30 days of NuAmenti 3 Gold — emailed August 10, use it for three weeks before the Summit</li>
              <li>• Full NuAmenti 3 Day recording</li>
            </ul>
            <p className="mt-4" style={{ fontSize: "15px", opacity: 0.7 }}>
              Your VIP reservation carries forward. The Vault adds $199.
            </p>
            {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
            <button
              type="button"
              onClick={becomeKeyHolder}
              disabled={busy || !gaVipVaultUrl}
              className="reserve-emerald-btn mt-6 w-full rounded-xl py-4 text-base sm:text-lg"
            >
              {busy ? "Working…" : "Become a Key Holder"}
            </button>
            {!gaVipVaultUrl ? (
              <p className="mt-3 text-xs opacity-70">Checkout is being configured. Please try again shortly.</p>
            ) : null}
          </section>
        </div>
      </main>
    </ReserveFrame>
  );
}
