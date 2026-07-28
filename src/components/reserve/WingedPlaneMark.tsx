/**
 * Reserve funnel — art-deco winged-plane mark.
 *
 * Pure inline SVG (no third-party image, no remote embed). Emerald + gold
 * on cosmic black. The whole frame is always visible (object-fit contain
 * is enforced by the SVG's own viewBox; there is no cropping).
 */
export function WingedPlaneMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label="AI AutoPilot art-deco winged emblem"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="wp-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0DFA0" />
          <stop offset="45%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#8B7220" />
        </linearGradient>
        <linearGradient id="wp-emerald" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#30D68B" />
          <stop offset="100%" stopColor="#067F53" />
        </linearGradient>
        <radialGradient id="wp-glow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#30D68B" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#0B0C0E" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Cosmic vignette */}
      <rect x="0" y="0" width="400" height="400" fill="#0B0C0E" />
      <circle cx="200" cy="200" r="180" fill="url(#wp-glow)" />

      {/* Outer art-deco frame */}
      <rect
        x="18" y="18" width="364" height="364"
        fill="none" stroke="url(#wp-gold)" strokeWidth="2"
      />
      <rect
        x="30" y="30" width="340" height="340"
        fill="none" stroke="url(#wp-gold)" strokeWidth="1" opacity="0.55"
      />

      {/* Deco corner chevrons */}
      {[
        [30, 30, 1, 1],
        [370, 30, -1, 1],
        [30, 370, 1, -1],
        [370, 370, -1, -1],
      ].map(([x, y, sx, sy], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
          <path d="M0 22 L22 0" stroke="url(#wp-gold)" strokeWidth="1.5" />
          <path d="M0 34 L34 0" stroke="url(#wp-gold)" strokeWidth="1" opacity="0.6" />
        </g>
      ))}

      {/* Deco vertical rays at top / bottom */}
      <g stroke="url(#wp-gold)" strokeWidth="1" opacity="0.5">
        <line x1="200" y1="30" x2="200" y2="60" />
        <line x1="180" y1="30" x2="180" y2="52" />
        <line x1="220" y1="30" x2="220" y2="52" />
        <line x1="160" y1="30" x2="160" y2="44" />
        <line x1="240" y1="30" x2="240" y2="44" />
        <line x1="200" y1="340" x2="200" y2="370" />
        <line x1="180" y1="348" x2="180" y2="370" />
        <line x1="220" y1="348" x2="220" y2="370" />
      </g>

      {/* Central deco disc */}
      <circle cx="200" cy="205" r="76" fill="none" stroke="url(#wp-gold)" strokeWidth="1" opacity="0.6" />
      <circle cx="200" cy="205" r="60" fill="none" stroke="url(#wp-gold)" strokeWidth="1" opacity="0.3" />

      {/* Winged plane — stylized, symmetric */}
      <g fill="url(#wp-emerald)" stroke="url(#wp-gold)" strokeWidth="1.25">
        {/* Fuselage */}
        <path d="M200 130 L212 235 L200 260 L188 235 Z" />
        {/* Nose cone highlight */}
        <path d="M200 130 L205 165 L200 175 L195 165 Z" fill="url(#wp-gold)" opacity="0.85" />
        {/* Left wing */}
        <path d="M188 190 L110 220 L92 232 L188 218 Z" />
        {/* Right wing */}
        <path d="M212 190 L290 220 L308 232 L212 218 Z" />
        {/* Left tail fin */}
        <path d="M195 250 L172 270 L198 262 Z" />
        {/* Right tail fin */}
        <path d="M205 250 L228 270 L202 262 Z" />
        {/* Top fin */}
        <path d="M200 130 L200 108 L206 128 Z" fill="url(#wp-gold)" opacity="0.9" />
      </g>

      {/* Wing streaks */}
      <g stroke="url(#wp-gold)" strokeWidth="0.75" opacity="0.7">
        <line x1="110" y1="220" x2="188" y2="216" />
        <line x1="290" y1="220" x2="212" y2="216" />
      </g>

      {/* Deco arc under plane */}
      <path
        d="M120 305 Q200 335 280 305"
        fill="none" stroke="url(#wp-gold)" strokeWidth="1.25"
      />
      <path
        d="M140 315 Q200 340 260 315"
        fill="none" stroke="url(#wp-gold)" strokeWidth="0.75" opacity="0.55"
      />
    </svg>
  );
}
