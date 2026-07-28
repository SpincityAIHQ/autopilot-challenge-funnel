import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { applyReserveNoStoreHeaders } from "@/lib/reserve-headers";
import { ReserveFrame } from "@/components/reserve/ReserveFrame";
import { RevealOnView } from "@/components/reserve/RevealOnView";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { getCommasConfig } from "@/lib/challenge-config";
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
    ],
  }),
  beforeLoad: async () => {
    await applyReserveNoStoreHeaders();
  },
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
  const cfg = getCommasConfig();
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
      const body = (await res.json().catch(() => null)) as { ok?: boolean; next?: string } | null;
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
        <RevealOnView delayMs={0}>
          <p className="reserve-eyebrow reserve-eyebrow--centered reserve-gold-text text-center">
            Your seat is held
          </p>
          <h1 className="mt-3 text-center reserve-display reserve-gold-text text-3xl sm:text-[42px] leading-tight">
            General Admission · Reserved
          </h1>
          <p className="mt-4 text-center reserve-body-lg">
            {first_name ? `${first_name}, ` : ""}your seat for August 29-30 is under your name.
            Nothing has been charged.
          </p>
        </RevealOnView>

        <RevealOnView delayMs={80}>
          <FunnelVideoSlot
            url={cfg.sectionVideos.checkout}
            label="Watch: General Admission and the VIP option"
            envKey="VITE_SUMMIT_VIDEO_CHECKOUT"
            className="mt-8"
          />
        </RevealOnView>

        <div className="mt-5 space-y-10">
          <RevealOnView delayMs={160}>
            <section className="reserve-card reserve-card--emerald p-6 sm:p-8">
              <p className="reserve-eyebrow reserve-gold-text">Choose once · Pay once</p>
              <p className="mt-4 reserve-body-lg">
                Your General Admission seat is already held. Choose the level that matches how much
                access and implementation support you want, then complete one Commas checkout.
              </p>
              <p className="mt-5 reserve-eyebrow reserve-gold-text">Option 1 · Upgrade to VIP</p>
              <p className="mt-3 reserve-mono-price text-[44px]">$99 Total</p>
              <p className="mt-2 reserve-note-15" style={{ opacity: 0.78 }}>
                Your $22 General Admission reservation carries forward. VIP adds $77.
              </p>
              <button
                type="button"
                onClick={upgrade}
                disabled={busy || tier === "ga_vip_vault"}
                className="reserve-cta-primary mt-5 w-full rounded-xl py-4 reserve-body-lg"
              >
                {busy ? "Upgrading…" : "Upgrade My Reservation to VIP"}
              </button>
              <p className="mt-3 text-center reserve-note-15" style={{ opacity: 0.7 }}>
                Nothing is charged by this button. Next, watch the VIP video and either settle the
                $99 total or continue to Emerald Key Holder.
              </p>

              <div className="my-6 flex items-center gap-4">
                <div className="reserve-hairline flex-1" />
                <span className="reserve-eyebrow reserve-gold-text" style={{ paddingTop: 0 }}>
                  or
                </span>
                <div className="reserve-hairline flex-1" />
              </div>

              <a
                href={gaUrl ?? "#"}
                aria-disabled={!gaUrl}
                onClick={(e) => {
                  if (!gaUrl) e.preventDefault();
                }}
                className={`block w-full rounded-xl py-4 text-center reserve-body-lg reserve-gold-btn ${
                  !gaUrl ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Keep General Admission · Settle $22
              </a>
              <p className="mt-3 text-center reserve-note-15" style={{ opacity: 0.7 }}>
                Opens the secure Commas checkout for one $22 General Admission payment.
              </p>
              {!gaUrl ? (
                <p className="mt-3 text-center reserve-note-15" style={{ opacity: 0.7 }}>
                  Checkout is being configured. Please try again shortly.
                </p>
              ) : null}

              <div className="mt-8 reserve-hairline" />
              <div className="mt-7 grid gap-7 sm:grid-cols-2">
                <div>
                  <p className="reserve-eyebrow reserve-gold-text">General Admission includes</p>
                  <ul className="mt-5 space-y-2 reserve-body-lg">
                    <li>• Both live Summit days, August 29-30</li>
                    <li>• The autonomous-business foundation build</li>
                    <li>• Niche, offer, infrastructure, and AI team mapping</li>
                    <li>• Live access from 1-4 PM Eastern both days</li>
                  </ul>
                  <p className="mt-4 reserve-note-15" style={{ opacity: 0.7 }}>
                    Best if you can attend live and want the core build experience.
                  </p>
                </div>
                <div>
                  <p className="reserve-eyebrow reserve-gold-text">VIP adds</p>
                  <ul className="mt-5 space-y-2 reserve-body-lg">
                    <li>• All six build workbooks</li>
                    <li>• Two hours with me after each day</li>
                    <li>• 30 days of recordings</li>
                    <li>• More time to ask questions and work through your build</li>
                  </ul>
                  <p className="mt-4 reserve-note-15" style={{ opacity: 0.7 }}>
                    You're holding $22. VIP adds $77.
                  </p>
                </div>
              </div>
              <div role="alert" aria-live="polite" className="min-h-[1.25rem] mt-3">
                {error ? (
                  <p className="reserve-note-15" style={{ color: "#FFB4B4" }}>
                    {error}
                  </p>
                ) : null}
              </div>
            </section>
          </RevealOnView>
        </div>
      </main>
    </ReserveFrame>
  );
}
