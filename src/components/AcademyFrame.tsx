import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { COMMUNITY_URL, GUIDES, type Guide, type Ticket } from "@/lib/academy";
import { useAcademySession } from "@/lib/academy-client";
import { ThothBubble } from "./ThothBubble";
/** Ticket badge: the student's current stage, named the way the guides name it. */
export function TicketBadge({ ticket }: { ticket?: Ticket | null }) {
  if (!ticket) return null;
  return (
    <span className="academy-ticket" data-tier={ticket.accelerator ? "accelerator" : ticket.summit}>
      Ticket · {ticket.label}
    </span>
  );
}
/** The guide's face: Thoth on the public floors, AI Spin inside the Accelerator. */
export function GuideAvatar({
  guide = GUIDES.thoth,
  size = 44,
  pulse = false,
}: {
  guide?: Guide;
  size?: number;
  pulse?: boolean;
}) {
  return (
    <span
      className={`academy-spin-avatar ${pulse ? "academy-spin-avatar-live" : ""}`}
      data-guide={guide.id}
      style={{ width: size, height: size }}
    >
      <img src={guide.avatar} alt={guide.name} width={size} height={size} />
    </span>
  );
}
export function AcademyFrame({
  children,
  ticket,
}: {
  children: ReactNode;
  ticket?: Ticket | null;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = useAcademySession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const signedIn = mounted && Boolean(session.email);
  const current = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "page" : undefined;
  return (
    <div className="academy-shell">
      <a className="academy-skip" href="#academy-main">
        Skip to content
      </a>
      <header className="academy-header">
        <div className="academy-header-inner">
          <a className="academy-brand" href="/">
            <img src="/nuamenti-mark.webp" alt="" width="38" height="38" />
            <span>
              AI AutoPilot<small>Education experience · SpinCityHQ × NuAmenti</small>
            </span>
          </a>
          <nav aria-label="Main navigation">
            <a href="/class" aria-current={current("/class")}>
              Free training
            </a>
            <a href="/summit" aria-current={current("/summit")}>
              Summit
            </a>
            <a href="/vault" aria-current={current("/vault")} className="academy-nav-vault">
              <span aria-hidden="true">◆</span> The Vault
            </a>
            <a href="/accelerator" aria-current={current("/accelerator")}>
              Accelerator
            </a>
            {signedIn ? (
              <>
                <a href="/learn" aria-current={current("/learn")}>
                  My learning
                </a>
                {ticket?.accelerator ? (
                  <a href="/ai-spin" aria-current={current("/ai-spin")}>
                    AI Spin
                  </a>
                ) : null}
                {ticket?.accelerator ? (
                  <a href="/book" aria-current={current("/book")}>
                    Book 1-on-1
                  </a>
                ) : null}
                <a href="/redeem" aria-current={current("/redeem")}>
                  Redeem
                </a>
              </>
            ) : (
              <a href="/join" className="academy-nav-cta">
                Join free
              </a>
            )}
          </nav>
        </div>
      </header>
      <main id="academy-main">{children}</main>
      <ThothBubble />
      <footer className="academy-footer">
        <div>
          <span>SpinCityHQ × NuAmenti</span>
          <span className="academy-label">AI AutoPilot · Education experience</span>
        </div>
        <nav aria-label="Footer">
          <a href={COMMUNITY_URL}>Free community</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/refund-policy">Refunds</a>
          <a href="mailto:Info@NuAmenti.com">Contact</a>
        </nav>
      </footer>
    </div>
  );
}
