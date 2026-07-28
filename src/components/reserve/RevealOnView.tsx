import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reserve-only scroll-reveal wrapper.
 * - 400ms opacity + 12px rise
 * - staggered by `delayMs`
 * - respects prefers-reduced-motion
 * - SSR / no-JS: content stays fully visible (opacity 1, no transform)
 * - IntersectionObserver disconnects after first reveal
 */
export function RevealOnView({
  children,
  delayMs = 0,
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined"
    ) {
      setVisible(true);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            window.setTimeout(() => setVisible(true), delayMs);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [delayMs]);

  const cls =
    "reserve-reveal" +
    (mounted ? " is-mounted" : "") +
    (visible ? " is-in" : "") +
    (className ? " " + className : "");

  return (
    <div ref={ref} className={cls}>
      {children}
    </div>
  );
}
