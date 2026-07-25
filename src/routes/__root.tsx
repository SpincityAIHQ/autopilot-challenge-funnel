import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-3 font-display text-5xl text-foreground">
          Off route
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          The page you're looking for isn't part of the Challenge.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Signal lost</p>
        <h1 className="mt-3 font-heading text-2xl font-semibold text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// Two live sessions represented as a parent Event with subEvents. Times
// have not been finalized publicly, so date-only values are used until
// exact session times are announced to registrants.
const JSON_LD_EVENT = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "AI AutoPilot Summit",
  description:
    "Two-day live online implementation Summit. Map It on Day 1, Build It on Day 2. Leave with a starter Autonomy Map and a first AI-assisted workflow to keep building.",
  startDate: "2026-08-24",
  endDate: "2026-08-25",
  eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  organizer: {
    "@type": "Organization",
    name: "SpincityHQ LLC",
    email: "Info@NuAmenti.com",
  },
  subEvent: [
    {
      "@type": "Event",
      name: "AI AutoPilot Summit — Day 1: Map It",
      startDate: "2026-08-24",
      endDate: "2026-08-24",
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
    },
    {
      "@type": "Event",
      name: "AI AutoPilot Summit — Day 2: Build It",
      startDate: "2026-08-25",
      endDate: "2026-08-25",
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
    },
  ],
};


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "AI AutoPilot Summit — Live Online · Aug 24–25, 2026" },
        {
          name: "description",
          content:
            "Two-day live online implementation Summit. Map three AI-assist workflow candidates and turn one on — live. Aug 24–25, 2026.",
        },
        { name: "author", content: "SpincityHQ LLC" },
        { name: "theme-color", content: "#0e0e14" },
        { property: "og:site_name", content: "AI AutoPilot Summit" },
        { property: "og:type", content: "website" },
        {
          property: "og:title",
          content: "AI AutoPilot Summit — Aug 24–25, 2026",
        },
        {
          property: "og:description",
          content:
            "Live online implementation. Leave with a starter Autonomy Map and a first AI-assisted workflow to keep building.",
        },


        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(JSON_LD_EVENT),
        },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
