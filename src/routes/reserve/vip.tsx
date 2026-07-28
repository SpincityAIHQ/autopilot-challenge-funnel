import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ReserveFrame } from "@/components/reserve/ReserveFrame";
import { isValidReservationToken } from "@/lib/reservation-token";
import { getReservationByToken } from "@/lib/reservation.functions";
import { resolveReserveCheckoutUrl } from "@/lib/reserve-checkout";

const searchSchema = z.object({ t: z.string().optional() });

export const Route = createFileRoute("/reserve/vip")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Your reservation — AI AutoPilot 2-Day Summit" },
      { name: "description", content: "Complete or upgrade your Summit reservation." },
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
    return { first_name: r.first_name, tier: r.tier_reserved, token: deps.t };
  },
  component: ReserveVipPage,
});

function ReserveVipPage() {
  const { first_name, tier, token } = Route.useLoaderData();
  const gaUrl = resolveReserveCheckoutUrl("ga");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/reserve-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, step: "vip" }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; next?: string }
        | null;
      if (!res.ok || !body?.ok || !body.next) {
        setError("Couldn't upgrade the reservation. Try again.");
        return;
      }
      window.location.assign(body.next);
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
          Your seat is held
        </p>
        <h1 className="mt-3 text-center reserve-display reserve-gold-text text-3xl sm:text-[42px] leading-tight">
          General Admission · Reserved
        </h1>
        <p className="mt-4 text-center text-base sm:text-lg">
          {first_name ? `${first_name}, ` : ""}your seat for August 29–30 is under your name.
          Nothing has been charged.
        </p>

        <div className="mt-12 sm:mt-16 space-y-8 sm:space-y-10">
          {/* CARD A */}
          <section className="reserve-card p-6 sm:p-8">
            <p className="reserve-eyebrow reserve-gold-text">Complete your reservation</p>
            <p className="mt-3 reserve-mono-price text-[34px]" style={{ color: "#30D68B" }}>
              $22
            </p>
            <p className="mt-2 text-sm opacity-80">
              Two-day live Summit access. Nothing else added.
            </p>
            <a
              href={gaUrl ?? "#"}
              aria-disabled={!gaUrl}
              onClick={(e) => { if (!gaUrl) e.preventDefault(); }}
              className={`mt-6 block w-full text-center rounded-xl py-4 text-base sm:text-lg reserve-gold-btn ${!gaUrl ? "pointer-events-none opacity-50" : ""}`}
            >
              Spend $22 Now
            </a>
            {!gaUrl ? (
              <p className="mt-3 text-xs opacity-70">Checkout is being configured. Please try again shortly.</p>
            ) : null}
          </section>

          <div className="flex items-center gap-4">
            <div className="reserve-hairline flex-1" />
            <span className="reserve-eyebrow reserve-gold-text">or</span>
            <div className="reserve-hairline flex-1" />
          </div>

          {/* CARD B */}
          <section className="reserve-card reserve-card--emerald p-6 sm:p-8">
            <p className="reserve-eyebrow" style={{ color: "#30D68B" }}>Upgrade to VIP</p>
            <p className="mt-3 reserve-mono-price text-[44px]" style={{ color: "#30D68B" }}>
              $99 Total
            </p>
            <ul className="mt-5 space-y-2 text-base sm:text-lg">
              <li>• All six build workbooks</li>
              <li>• Two hours with me after each day</li>
              <li>• 30 days of recordings</li>
            </ul>
            <p className="mt-4" style={{ fontSize: "15px", opacity: 0.7 }}>
              You're holding $22. VIP adds $77.
            </p>
            {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
            <button
              type="button"
              onClick={upgrade}
              disabled={busy || tier === "ga_vip_vault"}
              className="reserve-emerald-btn mt-6 w-full rounded-xl py-4 text-base sm:text-lg"
            >
              {busy ? "Upgrading…" : "Upgrade My Reservation"}
            </button>
          </section>
        </div>
      </main>
    </ReserveFrame>
  );
}
