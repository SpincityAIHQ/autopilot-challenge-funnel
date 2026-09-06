import type { ReactNode } from "react";
import { COMMUNITY_URL } from "@/lib/academy";
export function AcademyFrame({ children }: { children: ReactNode }) {
  return (
    <div className="academy-shell">
      <a className="academy-skip" href="#academy-main">
        Skip to content
      </a>
      <header className="academy-header">
        <a className="academy-brand" href="/">
          <img src="/nuamenti-mark.webp" alt="" width="40" height="40" />
          <span>
            AI AUTOPILOT<small>SUMMIT · BY SPINCITYHQ</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="/class">Free classroom</a>
          <a href="/summit">Summit</a>
          <a href="/learn">My learning</a>
          <a href="/redeem">Redeem code</a>
        </nav>
      </header>
      <main id="academy-main">{children}</main>
      <footer className="academy-footer">
        <span>SpinCityHQ × NuAmenti</span>
        <nav aria-label="Footer">
          <a href={COMMUNITY_URL}>Free community</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/refund-policy">Refunds</a>
        </nav>
      </footer>
    </div>
  );
}
