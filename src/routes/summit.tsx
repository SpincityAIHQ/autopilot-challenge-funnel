import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AcademyFrame } from "@/components/AcademyFrame";
import { academyJoinHref } from "@/lib/academy-navigation";
import {
  ACCELERATOR_OFFER,
  LESSONS,
  SUMMIT_OFFERS,
  lessonHref,
  tierAllows,
  type Ticket,
} from "@/lib/academy";
import { academyApi, useAcademySession, useCatalogue } from "@/lib/academy-client";

export const Route = createFileRoute("/summit")({
  head: () => ({
    meta: [
      { title: "Summit sessions | AI AutoPilot" },
      {
        name: "description",
        content:
          "Watch the five recorded AI AutoPilot Summit sessions and pick the ticket that opens them.",
      },
      { property: "og:title", content: "Summit sessions | AI AutoPilot" },
      {
        property: "og:description",
        content: "Five recorded Summit sessions, each with notes, an activity sheet and your tutor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Summit,
});

/** The five paid Summit recordings, in the order they are meant to be watched. */
const SUMMIT_IDS = [
  "business-before-ai",
  "hire-the-ai-team",
  "coordinate-the-business",
  "measure-the-system",
  "own-the-platform",
];

function Summit() {
  const session = useAcademySession();
  const catalogue = useCatalogue();
  const [grants, setGrants] = useState<string[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  useEffect(() => {
    if (!session.email) {
      setGrants([]);
      setTicket(null);
      return;
    }
    academyApi<{ grants: string[]; ticket: Ticket }>("dashboard")
      .then((d) => {
        setGrants(d.grants ?? []);
        setTicket(d.ticket ?? null);
      })
      .catch(() => {});
  }, [session.email]);
  const lessons = SUMMIT_IDS.map((id) => LESSONS.find((l) => l.id === id)!).filter(Boolean);
  return (
    <AcademyFrame ticket={ticket}>
      <section className="academy-section">
        <div className="academy-section-heading">
          <p className="academy-eyebrow">Summit · recorded August 29–31, 2026</p>
          <h1>Welcome to the Summit.</h1>
          <p className="academy-lead">
            Three days, recorded and waiting for you. Pick a session and step into the classroom.
          </p>
        </div>

        <div className="academy-learning-grid">
          {lessons.map((l, i) => {
            const unlocked = session.email ? tierAllows(grants, l.tier) : false;
            const connected = catalogue ? catalogue.connected.includes(l.id) : true;
            return (
              <article className="academy-card" key={l.id} data-locked={!unlocked}>
                <span className="academy-number">
                  {String(i + 1).padStart(2, "0")} / {l.stage}
                </span>
                <h2>{l.title}</h2>
                <p>{l.summary}</p>
                <p className="academy-muted">
                  {unlocked
                    ? connected
                      ? "Ready to watch."
                      : "Recording not connected yet."
                    : session.email
                      ? "Unlocks with the matching Summit ticket."
                      : "Sign in and redeem your access code to watch."}
                </p>
                <a
                  className={`academy-button ${unlocked ? "" : "academy-button-secondary"}`}
                  href={unlocked ? lessonHref(l.id) : session.email ? "#tickets" : academyJoinHref("/summit", true)}
                >
                  {unlocked ? "Open the classroom" : session.email ? "Get access" : "Sign in"}
                </a>
              </article>
            );
          })}
        </div>

        <div className="academy-section-heading" id="tickets" style={{ marginTop: 48 }}>
          <p className="academy-eyebrow">Tickets</p>
          <h2>Choose how far you want to go.</h2>
          <p>
            Every recording keeps your watch map, and Thoth knows your ticket. Review the current
            access and refund terms at checkout.
          </p>
        </div>
        <div className="academy-three">
          {SUMMIT_OFFERS.map((o) => (
            <article
              className={`academy-card academy-offer ${o.tier === "vip" ? "academy-card-featured" : ""}`}
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
                Get instant access
              </a>
              <p className="academy-muted">Current terms shown at checkout.</p>
            </article>
          ))}
        </div>
        <div className="academy-callout academy-card academy-card-gold">
          <div>
            <p className="academy-eyebrow">Already purchased?</p>
            <h2>Activate your ticket.</h2>
            <p>
              Sign in with the email you used at checkout, then redeem the access code sent for your
              purchase. Each code unlocks its matching Summit tier.
            </p>
          </div>
          <a className="academy-button academy-button-secondary" href="/redeem">
            Redeem my access code
          </a>
        </div>
        <div className="academy-callout">
          <div>
            <p className="academy-eyebrow">The next stage</p>
            <h2>{ACCELERATOR_OFFER.name}</h2>
            <p>{ACCELERATOR_OFFER.includes}.</p>
          </div>
          <a href="/accelerator" className="academy-text-button">
            Explore the Accelerator →
          </a>
        </div>
      </section>
    </AcademyFrame>
  );
}

