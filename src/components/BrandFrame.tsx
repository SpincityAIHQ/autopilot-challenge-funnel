import type { ReactNode } from "react";
import { NUAMENTI_MARK_DATA_URI } from "@/lib/brand-assets";

export function BrandFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -right-28 top-16 h-80 w-80 rounded-full bg-[color:var(--emerald-signal)]/10 blur-3xl sm:h-[34rem] sm:w-[34rem]" />
        <img
          src={NUAMENTI_MARK_DATA_URI}
          alt=""
          className="absolute -right-28 top-24 w-72 opacity-[0.045] sm:-right-16 sm:w-[34rem]"
        />
        <div className="absolute -left-28 bottom-0 h-80 w-80 rounded-full bg-[color:var(--gold)]/10 blur-3xl sm:h-[30rem] sm:w-[30rem]" />
        <div className="absolute left-1/2 top-[34rem] h-px w-[80vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-[color:var(--gold)]/20 to-transparent" />
      </div>

      <header className="relative z-20 border-b border-[color:var(--hairline)] bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <a href="/" className="flex min-w-0 items-center gap-3">
            <img
              src={NUAMENTI_MARK_DATA_URI}
              alt="NuAmenti"
              className="h-11 w-11 shrink-0 rounded-full object-cover shadow-[0_0_28px_rgba(48,214,139,0.28)] sm:h-12 sm:w-12"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-[10px] tracking-[0.14em] text-foreground sm:text-sm sm:tracking-[0.18em]">
                SPINCITYHQ <span className="text-[color:var(--gold)]">&amp;</span> NUAMENTI
              </p>
              <p className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground sm:text-[10px] sm:tracking-[0.2em]">
                Presents · AI AutoPilot 2-Day Summit
              </p>
            </div>
          </a>

          <div
            aria-hidden
            className="relative hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[color:var(--gold)]/70 shadow-[0_0_24px_rgba(48,214,139,0.18)] sm:flex"
          >
            <div className="absolute inset-1.5 rounded-full border border-[color:var(--gold-soft)]/50" />
            <div className="absolute inset-3 rounded-full border border-[color:var(--emerald-signal)]/50" />
            <div className="h-2.5 w-2.5 rotate-45 border border-[color:var(--gold)] bg-[color:var(--emerald-signal)] shadow-[0_0_16px_rgba(48,214,139,0.7)]" />
          </div>
        </div>
      </header>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function BrandSignature() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--gold-soft)]/40 bg-[color:var(--surface-1)]/80 p-3 shadow-2xl backdrop-blur sm:max-w-md">
      <img
        src={NUAMENTI_MARK_DATA_URI}
        alt="NuAmenti"
        className="h-16 w-16 shrink-0 rounded-lg object-cover shadow-[0_0_22px_rgba(48,214,139,0.22)] sm:h-20 sm:w-20"
      />
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--emerald-signal)] sm:text-[10px]">
          SpinCityHQ &amp; NuAmenti present
        </p>
        <p className="mt-1 font-display text-sm leading-snug text-foreground sm:text-base">
          AI AutoPilot 2-Day Summit
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Build the system. Hire the AI team. Keep human control.
        </p>
      </div>
    </div>
  );
}
