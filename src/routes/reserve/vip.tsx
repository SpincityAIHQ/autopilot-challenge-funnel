import { createFileRoute, Link, redirect } from "@tanstack/react-router";
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
  const { first_name, token } = Route.useLoaderData();
  const cfg = getCommasConfig();
  const gaUrl = resolveReserveCheckoutUrl("ga");

  function recordVipReservation() {
    void fetch("/api/public/reserve-upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, step: "vip" }),
      keepalive: true,
    }).catch(() => undefined);
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
              <p className="reserve-eyebrow reserve-gold-text">Choose your Summit experience</p>
              <p className="mt-4 reserve-body-lg">
                Your General Admission seat is already held. Choose the level that matches how much
                access and implementation support you want.
              </p>
              <p className="mt-5 reserve-eyebrow reserve-gold-text">Option 1 · Upgrade to VIP</p>
              <p className="mt-3 reserve-mono-price text-[44px]">$99 Total</p>
              <p className="mt-2 reserve-note-15" style={{ opacity: 0.78 }}>
                Your $22 General Admission reservation carries forward. VIP adds $77.
              </p>
              <Link
                to="/reserve/vault"
                search={{ t: token }}
                onClick={recordVipReservation}
                className="reserve-cta-primary mt-5 block w-full rounded-xl py-4 text-center reserve-body-lg"
              >
                Upgrade My Reservation to VIP
              </Link>
              <p className="mt-3 text-center reserve-note-15" style={{ opacity: 0.7 }}>
                Continue to the VIP video to review VIP and the Emerald Vault Key before you pay.
              </p>

              <div className="my-6 flex items-center gap-4">
                <div className="reserve-hairline flex-1" />
                <span className="reserve-eyebrow reserve-gold-text" style={{ paddingTop: 0 }}>
                  or
                </span>
                <div className="reserve-hairline flex-1" />
              </div>

              <a
                href={gaUrl!}
                target="_top"
                className="block w-full rounded-xl py-4 text-center reserve-body-lg reserve-gold-btn"
              >
                Get General Admission · $22
              </a>
              <p className="mt-3 text-center reserve-note-15" style={{ opacity: 0.7 }}>
                Continue to secure Shopify checkout.
              </p>
              <div className="mt-8 reserve-hairline" />
              <div className="mt-7 grid gap-7 sm:grid-cols-2">
                <div>
                  <p className="reserve-eyebrow reserve-gold-text">General Admission includes</p>
                  <ul className="mt-5 space-y-2 reserve-body-lg">
                    <li>• Both live Summit days, August 29-30</li>
                    <li>• The autonomous-business foundation build</li>
                    <li>• Niche, offer, infrastructure, and AI team mapping</li>
                    <li>• Live access from 11 AM-4 PM Eastern both days</li>
                  </ul>
                  <p className="mt-4 reserve-note-15" style={{ opacity: 0.7 }}>
                    Best if you can attend live and want the core build experience.
                  </p>
                </div>
                <div>
                  <p className="reserve-eyebrow reserve-gold-text">VIP adds</p>
                  <ul className="mt-5 space-y-2 reserve-body-lg">
                    <li>• All six build workbooks</li>
                    <li>• VIP Build Lab immediately after Day 2</li>
                    <li>• 30 days of recordings</li>
                    <li>• MVP App Builder</li>
                    <li>• AI Business GPS</li>
                    <li>• Internal Agent Builder Skill</li>
                    <li>• More time to ask questions and work through your build</li>
                  </ul>
                  <p className="mt-4 reserve-note-15" style={{ opacity: 0.7 }}>
                    You're holding $22. VIP adds $77.
                  </p>
                </div>
              </div>
            </section>
          </RevealOnView>
        </div>
      </main>
    </ReserveFrame>
  );
}
