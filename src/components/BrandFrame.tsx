import type { ReactNode } from "react";
import {
  NUAMENTI_MARK_DATA_URI,
  PERFECT_AIM_DATA_URI,
} from "@/lib/brand-assets";

export function BrandFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -right-28 top-20 h-80 w-80 rounded-full bg-[color:var(--emerald-signal)]/10 blur-3xl sm:h-[30rem] sm:w-[30rem]" />
        <img
          src={NUAMENTI_MARK_DATA_URI}
          alt=""
          className="absolute -right-28 top-24 w-72 opacity-[0.045] sm:-right-20 sm:w-[30rem]"
        />
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[color:var(--gold)]/8 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-[color:var(--hairline)] bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <a href="/" className="flex min-w-0 items-center gap-3">
            <img
              src={NUAMENTI_MARK_DATA_URI}
              alt="NuAmenti"
              className="h-11 w-11 shrink-0 rounded-full object-cover shadow-[0_0_24px_rgba(48,214,139,0.25)] sm:h-12 sm:w-12"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-[11px] tracking-[0.18em] text-foreground sm:text-sm">
                NUAMENTI <span className="text-[color:var(--gold)]">×</span> PERFECT AIM
              </p>
              <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:text-[10px]">
                AI AutoPilot Summit
              </p>
            </div>
          </a>

          <img
            src={PERFECT_AIM_DATA_URI}
            alt="Perfect Aim"
            className="hidden h-14 w-14 shrink-0 rounded-md border border-[color:var(--gold-soft)]/40 object-cover shadow-lg sm:block"
          />
        </div>
      </header>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function BrandSignature() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--gold-soft)]/35 bg-[color:var(--surface-1)]/80 p-3 shadow-2xl backdrop-blur sm:max-w-sm">
      <img
        src={PERFECT_AIM_DATA_URI}
        alt="Perfect Aim Podcast"
        className="h-16 w-16 shrink-0 rounded-lg object-cover sm:h-20 sm:w-20"
      />
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--emerald-signal)] sm:text-[10px]">
          Presented together
        </p>
        <p className="mt-1 font-display text-sm leading-snug text-foreground sm:text-base">
          NuAmenti × Perfect AIM
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Human vision. Governed AI execution. Perfect aim.
        </p>
      </div>
    </div>
  );
}
