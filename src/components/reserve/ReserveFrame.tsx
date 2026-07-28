import type { ReactNode } from "react";

/**
 * Local design shell for the three /reserve pages. The rest of the app
 * keeps its existing BrandFrame; this only wraps reserve routes with the
 * cosmic + textured surface required by the reserve design system.
 */
export function ReserveFrame({ children }: { children: ReactNode }) {
  return (
    <div className="reserve-shell min-h-screen">
      <div aria-hidden="true" className="reserve-noise pointer-events-none fixed inset-0" />
      <div aria-hidden="true" className="reserve-vignette pointer-events-none fixed inset-0" />
      <div className="relative z-10">{children}</div>
      <style>{`
        .reserve-shell {
          background:
            radial-gradient(1200px 800px at 50% 0%, #141619 0%, #0B0C0E 55%),
            #0B0C0E;
          color: #F5F1E4;
          font-family: "Rajdhani", ui-sans-serif, system-ui, sans-serif;
          font-size: 17px;
          line-height: 1.65;
        }
        .reserve-noise {
          background-image:
            radial-gradient(rgba(240,223,160,0.04) 1px, transparent 1px),
            radial-gradient(rgba(48,214,139,0.03) 1px, transparent 1px);
          background-size: 3px 3px, 5px 5px;
          background-position: 0 0, 1px 2px;
          opacity: 0.6;
        }
        .reserve-vignette {
          background: radial-gradient(circle at 50% 40%, transparent 45%, rgba(0,0,0,0.7) 100%);
        }
        .reserve-gold-text {
          background: linear-gradient(180deg, #F0DFA0 0%, #D4AF37 45%, #8B7220 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .reserve-gold-btn {
          background: linear-gradient(180deg, #F0DFA0 0%, #D4AF37 45%, #8B7220 100%);
          color: #141619;
          border: 1px solid rgba(240,223,160,0.5);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.35),
            0 12px 30px -12px rgba(212,175,55,0.55);
          font-family: "Orbitron", ui-sans-serif, system-ui, sans-serif;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .reserve-gold-btn[disabled] {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .reserve-emerald-btn {
          background: linear-gradient(180deg, #14C97D 0%, #067F53 100%);
          color: #0B0C0E;
          border: 1px solid rgba(48,214,139,0.55);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.25),
            0 0 22px rgba(48,214,139,0.35);
          font-family: "Orbitron", ui-sans-serif, system-ui, sans-serif;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          animation: reserve-breath 3s ease-in-out infinite;
        }
        .reserve-emerald-btn[disabled] {
          opacity: 0.5;
          cursor: not-allowed;
          animation: none;
        }
        @keyframes reserve-breath {
          0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 0 18px rgba(48,214,139,0.28); }
          50%     { box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 0 34px rgba(48,214,139,0.55); }
        }
        @media (prefers-reduced-motion: reduce) {
          .reserve-emerald-btn { animation: none; }
        }
        .reserve-card {
          background: #141619;
          border: 1px solid rgba(240,223,160,0.20);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 30px 60px -30px rgba(0,0,0,0.9);
          border-radius: 14px;
        }
        .reserve-card--emerald {
          border-color: rgba(48,214,139,0.55);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 0 24px rgba(48,214,139,0.12),
            0 30px 60px -30px rgba(0,0,0,0.9);
        }
        .reserve-hairline {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(240,223,160,0.4), transparent);
        }
        .reserve-eyebrow {
          font-family: "Space Mono", ui-monospace, monospace;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-size: 12px;
        }
        .reserve-display {
          font-family: "Orbitron", ui-sans-serif, system-ui, sans-serif;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .reserve-mono-price {
          font-family: "Space Mono", ui-monospace, monospace;
          letter-spacing: 0.15em;
        }
        .reserve-jewel {
          background:
            radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), transparent 40%),
            linear-gradient(135deg, #30D68B 0%, #14996A 45%, #08543A 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow:
            0 0 12px rgba(48,214,139,0.35);
        }
        .reserve-input {
          width: 100%;
          background: #0F1113;
          border: 1px solid rgba(240,223,160,0.2);
          color: #F5F1E4;
          padding: 14px 16px;
          border-radius: 10px;
          font-family: "Rajdhani", ui-sans-serif, system-ui, sans-serif;
          font-size: 17px;
        }
        .reserve-input:focus-visible {
          outline: 2px solid #F0DFA0;
          outline-offset: 2px;
          border-color: transparent;
        }
        .reserve-label {
          font-family: "Space Mono", ui-monospace, monospace;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-size: 11px;
          color: rgba(245,241,228,0.7);
        }
      `}</style>
    </div>
  );
}
