import { createFileRoute } from "@tanstack/react-router";
import { AcademyFrame } from "@/components/AcademyFrame";
import { SUMMIT_OFFERS } from "@/lib/academy";
import { academyApi } from "@/lib/academy-client";
export const Route = createFileRoute("/summit")({
  head: () => ({ meta: [{ title: "Summit access | AI AutoPilot" }] }),
  component: Summit,
});
function Summit() {
  return (
    <AcademyFrame>
      <section className="academy-section">
        <div className="academy-section-heading">
          <p className="academy-eyebrow">RECORDED AUGUST 29–31, 2026</p>
          <h1>Go deeper into the Summit.</h1>
          <p className="academy-lead">
            Choose the sessions that match the work you are ready to do. Review the current access
            and refund terms at checkout.
          </p>
        </div>
        <div className="academy-three">
          {SUMMIT_OFFERS.map((o) => (
            <article
              className={`academy-card academy-offer ${o.tier === "vip" ? "academy-offer-featured" : ""}`}
              key={o.tier}
            >
              <p className="academy-eyebrow">{o.label}</p>
              <h2>{o.name}</h2>
              <p className="academy-price">
                ${o.price}
                <small>USD</small>
              </p>
              <p>{o.includes}</p>
              <a
                className="academy-button"
                href={o.url}
                onClick={() => {
                  void academyApi("event", {
                    name: "checkout_clicked",
                    offer: o.tier,
                    eventId: crypto.randomUUID(),
                  }).catch(() => {});
                }}
              >
                Buy on Shopify
              </a>
              <p className="academy-muted">Current terms shown on Shopify.</p>
            </article>
          ))}
        </div>
        <div className="academy-callout academy-section">
          <div>
            <h2>Already purchased?</h2>
            <p>
              Sign in with the email used at Shopify, then redeem the access code sent for your
              purchase. Each code unlocks its matching Summit tier.
            </p>
          </div>
          <a className="academy-button academy-button-secondary" href="/redeem">
            Redeem my access code
          </a>
        </div>
        <div className="academy-callout">
          <div>
            <p className="academy-eyebrow">THE NEXT STAGE</p>
            <h2>Autopilot Accelerator</h2>
            <p>Bring your business into guided implementation.</p>
          </div>
          <a href="/accelerator" className="academy-text-button">
            Explore the Accelerator →
          </a>
        </div>
      </section>
    </AcademyFrame>
  );
}
