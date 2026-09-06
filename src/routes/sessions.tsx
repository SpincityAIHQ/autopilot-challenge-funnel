import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AcademyFrame, TicketBadge } from "@/components/AcademyFrame";
import { LESSONS, lessonHref, tierAllows, type Ticket } from "@/lib/academy";
import { academyApi, useAcademySession, useCatalogue } from "@/lib/academy-client";

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Summit sessions | AI AutoPilot" },
      {
        name: "description",
        content:
          "Choose one of the five recorded AI AutoPilot Summit sessions and open its learning environment.",
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
  component: Sessions,
});

/** The five paid Summit recordings, in the order they are meant to be watched. */
const SUMMIT_IDS = [
  "business-before-ai",
  "hire-the-ai-team",
  "coordinate-the-business",
  "measure-the-system",
  "own-the-platform",
];

function Sessions() {
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
        <div className="academy-class-head">
          <div className="academy-section-heading" style={{ marginBottom: 0 }}>
            <p className="academy-eyebrow">Summit · recorded August 29–31, 2026</p>
            <h1>Pick a session.</h1>
            <p className="academy-lead">
              Five recordings. Each one opens the same classroom as the free training: the video,
              the AI notes, the activity sheet and your tutor.
            </p>
          </div>
          <TicketBadge ticket={ticket} />
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
                  href={unlocked ? lessonHref(l.id) : session.email ? "/summit" : "/join"}
                >
                  {unlocked ? "Open the classroom" : session.email ? "Get access" : "Sign in"}
                </a>
              </article>
            );
          })}
        </div>
        <div className="academy-callout academy-card academy-card-gold">
          <div>
            <p className="academy-eyebrow">Already purchased?</p>
            <h2>Redeem your access code.</h2>
            <p>Sign in with your checkout email, then redeem the code to unlock these sessions.</p>
          </div>
          <a className="academy-button academy-button-secondary" href="/redeem">
            Redeem my code
          </a>
        </div>
      </section>
    </AcademyFrame>
  );
}
