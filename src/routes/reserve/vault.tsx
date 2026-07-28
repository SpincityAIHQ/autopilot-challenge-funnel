import { createFileRoute, redirect } from "@tanstack/react-router";
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

export const Route = createFileRoute("/reserve/vault")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Your VIP reservation — AI AutoPilot 2-Day Summit" },
      { name: "description", content: "Complete or upgrade your VIP reservation." },
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
    return { first_name: r.first_name, token: deps.t };
  },
  component: ReserveVaultPage,
});

function ReserveVaultPage() {
  const { first_name, token } = Route.useLoaderData();
  const cfg = getCommasConfig();
  const gaVipUrl = resolveReserveCheckoutUrl("ga_vip");
  const gaVipVaultUrl = resolveReserveCheckoutUrl("ga_vip_vault");

  function recordVaultReservation() {
    void fetch("/api/public/reserve-upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, step: "vault" }),
      keepalive: true,
    }).catch(() => undefined);
  }

  return (
    <ReserveFrame>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:py-24">
        <RevealOnView delayMs={0}>
          <p className="reserve-eyebrow reserve-eyebrow--centered reserve-gold-text text-center">
            Your VIP reservation is held
          </p>
          <h1 className="mt-3 text-center reserve-display reserve-gold-text text-3xl sm:text-[42px] leading-tight">
            VIP · Reserved
          </h1>
          {first_name ? (
            <p className="mt-4 text-center reserve-body-lg">
              {first_name}, nothing has been charged yet.
            </p>
          ) : null}
        </RevealOnView>

        <RevealOnView delayMs={80}>
          <FunnelVideoSlot
            url={cfg.sectionVideos.thankYouVip}
            label="Watch: your VIP reservation and the Emerald Key Holder option"
            envKey="VITE_SUMMIT_VIDEO_THANK_YOU_VIP"
            className="mt-8"
          />
        </RevealOnView>

        <div className="mt-5 space-y-10">
          <RevealOnView delayMs={160}>
            <section className="reserve-card--vault p-6 sm:p-8">
              <p className="reserve-eyebrow reserve-gold-text">Choose your complete access level</p>
              <p className="mt-4 reserve-body-lg">
                Your VIP reservation is held. Choose VIP access for $99 or add the Emerald Vault Key
                and private Day 3 access for $298 total.
              </p>
              <p className="mt-6 reserve-eyebrow reserve-jewel">The complete package</p>
              <p className="mt-3 reserve-mono-price text-[48px] reserve-jewel">$298 Total</p>
              <p className="mt-2 reserve-note-15" style={{ opacity: 0.78 }}>
                AI AutoPilot Summit + VIP + Emerald Vault Key + private Day 3
              </p>
              <a
                href={gaVipVaultUrl!}
                target="_top"
                onClick={recordVaultReservation}
                className="reserve-cta-primary mt-5 block w-full rounded-xl py-4 text-center reserve-body-lg"
              >
                Get the Emerald Vault Key · $298
              </a>
              <p className="mt-3 text-center reserve-note-15" style={{ opacity: 0.7 }}>
                Continue to secure Shopify checkout.
              </p>

              <div className="my-6 flex items-center gap-4">
                <div className="reserve-hairline flex-1" />
                <span className="reserve-eyebrow reserve-gold-text" style={{ paddingTop: 0 }}>
                  or
                </span>
                <div className="reserve-hairline flex-1" />
              </div>

              <a
                href={gaVipUrl!}
                target="_top"
                className="block w-full rounded-xl py-4 text-center reserve-body-lg reserve-gold-btn"
              >
                Get VIP Access · $99
              </a>
              <p className="mt-3 text-center reserve-note-15" style={{ opacity: 0.7 }}>
                Continue to secure Shopify checkout.
              </p>
              <div className="mt-8 reserve-hairline" />
              <div className="mt-7 grid gap-7 sm:grid-cols-2">
                <div>
                  <p className="reserve-eyebrow reserve-gold-text">Your VIP reservation includes</p>
                  <ul className="mt-5 space-y-2 reserve-body-lg">
                    <li>• Both live Summit days</li>
                    <li>• All six build workbooks</li>
                    <li>• VIP Build Lab immediately after Day 2</li>
                    <li>• 30 days of Summit recordings</li>
                    <li>• MVP App Builder</li>
                    <li>• AI Business GPS</li>
                    <li>• Internal Agent Builder Skill</li>
                  </ul>
                  <p className="mt-4 reserve-note-15" style={{ opacity: 0.7 }}>
                    Best if you want the complete live experience, replay access, and added build
                    time.
                  </p>
                </div>
                <div>
                  <p className="reserve-eyebrow reserve-jewel">
                    Emerald Key Holder adds Spin's time
                  </p>
                  <p className="mt-5 reserve-body-lg">
                    This is not another stack of tools. Emerald unlocks a private, unlisted Day 3
                    Vault Opener Class with Spin so you can open the system, connect it to your
                    business, and work through your implementation questions live.
                  </p>
                  <ul className="mt-5 space-y-2 reserve-body-lg">
                    <li>• Secret Day 3 Vault Opener Class with Spin</li>
                    <li>• Two additional live hours with Spin</li>
                    <li>• Private room details delivered after purchase</li>
                    <li>
                      • 30 days of NuAmenti 3 Gold — emailed August 10 for use before the Summit
                    </li>
                    <li>• Full NuAmenti 3 Day recording</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4 reserve-note-15" style={{ opacity: 0.7 }}>
                Choose the access level that matches the live support and private time you want.
              </p>
            </section>
          </RevealOnView>
        </div>
      </main>
    </ReserveFrame>
  );
}
