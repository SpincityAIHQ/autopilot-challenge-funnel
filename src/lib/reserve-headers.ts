/**
 * Client-safe wrapper. On the server it delegates to the `.server.ts`
 * sibling which sets `Cache-Control: private, no-store` and
 * `X-Robots-Tag: noindex, nofollow`. On the client it's a noop.
 *
 * Import protection blocks direct route imports of
 * `@tanstack/react-start/server`, so route beforeLoads call THIS
 * function instead.
 */
import { createIsomorphicFn } from "@tanstack/react-start";

export const applyReserveNoStoreHeaders = createIsomorphicFn()
  .client(() => {})
  .server(async () => {
    const mod = await import("./reserve-headers.server");
    mod.applyReserveNoStoreHeadersServer();
  });
