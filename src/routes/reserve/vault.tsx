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
    if (r.tier_reserved === "ga") {
      throw redirect({ to: "/reserve/vip", search: { t: deps.t } });
    }
    return { first_name: r.first_name, tier: r.tier_reserved, token: deps.t };
  },
  component: ReserveVaultPage,
});

function ReserveVaultPage() {
  const { first_name, token } = Route.useLoaderData();
  const cfg = getCommasConfig();
  const gaVipUrl = resolveReserveCheckoutUrl("ga_vip");
  const gaVipVaultUrl = resolveReserveCheckoutUrl("ga_vip_vault");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function becomeKeyHolder() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/reserve-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, step: "vault" }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        next?: string | null;
        error?: string;
      } | null;
      if (!res.ok || !body?.ok || !gaVipVaultUrl) {
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
                Your VIP reservation is held. Choose VIP access for $99 or unlock the complete
                Summit + VIP + Emerald Vault Key package for $298.
              </p>
              <p className="mt-6 reserve-eyebrow reserve-jewel">The complete package</p>
              <p className="mt-3 reserve-mono-price text-[48px] reserve-jewel">$298 Total</p>
              <p className="mt-2 reserve-note-15" style={{ opacity: 0.78 }}>
                AI AutoPilot Summit + VIP + Emerald Vault Key
              </p>
              <button
                type="button"
                onClick={becomeKeyHolder}
                disabled={busy || !gaVipVaultUrl}
                className="reserve-cta-primary mt-5 w-full rounded-xl py-4 reserve-body-lg"
              >
                {busy ? "Opening Checkout…" : "Get the Emerald Vault Key · $298"}
              </button>
              <p className="mt-3 text-center reserve-note-15" style={{ opacity: 0.7 }}>
                Complete your secure payment through SpincityHQ.
              </p>

              <div className="my-6 flex items-center gap-4">
                <div className="reserve-hairline flex-1" />
                <span className="reserve-eyebrow reserve-gold-text" style={{ paddingTop: 0 }}>
                  or
                </span>
                <div className="reserve-hairline flex-1" />
              </div>

              <a
                href={gaVipUrl ?? "#"}
                aria-disabled={!gaVipUrl}
                onClick={(e) => {
                  if (!gaVipUrl) e.preventDefault();
                }}
                className={`block w-full rounded-xl py-4 text-center reserve-body-lg reserve-gold-btn ${
                  !gaVipUrl ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Get VIP Access · $99
              </a>
              <p className="mt-3 text-center reserve-note-15" style={{ opacity: 0.7 }}>
                Complete your secure VIP payment through SpincityHQ.
              </p>
              {!gaVipUrl ? (
                <p className="mt-3 text-center reserve-note-15" style={{ opacity: 0.7 }}>
                  Checkout is being configured. Please try again shortly.
                </p>
              ) : null}

              <div className="mt-8 reserve-hairline" />
              <div className="mt-7 grid gap-7 sm:grid-cols-2">
                <div>
                  <p className="reserve-eyebrow reserve-gold-text">Your VIP reservation includes</p>
                  <ul className="mt-5 space-y-2 reserve-body-lg">
                    <li>• Both live Summit days</li>
                    <li>• All six build workbooks</li>
                    <li>• Two hours with me after each day</li>
                    <li>• 30 days of Summit recordings</li>
                  </ul>
                  <p className="mt-4 reserve-note-15" style={{ opacity: 0.7 }}>
                    Best if you want the complete live experience, replay access, and added build
                    time.
                  </p>
                </div>
                <div>
                  <p className="reserve-eyebrow reserve-jewel">Emerald Key Holder adds</p>
                  <p className="mt-5 reserve-body-lg">
                    You're not getting a course about our system. You're getting the system files we
                    use to plan apps, align AI tools, and build for clients paying $20,000 and up.
                  </p>
                  <ul className="mt-5 space-y-2 reserve-body-lg">
                    <li>• MVP App Builder</li>
                    <li>• AI Business GPS</li>
                    <li>
                      • 30 days of NuAmenti 3 Gold — emailed August 10, use it for three weeks
                      before the Summit
                    </li>
                    <li>• Full NuAmenti 3 Day recording</li>
                  </ul>
                </div>
              </div>
              <p className="mt-4 reserve-note-15" style={{ opacity: 0.7 }}>
                Choose the access level that matches the build support and system files you want.
              </p>
              <div role="alert" aria-live="polite" className="min-h-[1.25rem] mt-3">
                {error ? (
                  <p className="reserve-note-15" style={{ color: "#FFB4B4" }}>
                    {error}
                  </p>
                ) : null}
              </div>
              {!gaVipVaultUrl ? (
                <p className="mt-3 text-center reserve-note-15" style={{ opacity: 0.7 }}>
                  Checkout is being configured. Please try again shortly.
                </p>
              ) : null}
            </section>
          </RevealOnView>
        </div>
      </main>
    </ReserveFrame>
  );
}
