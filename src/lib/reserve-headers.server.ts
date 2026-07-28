import { setResponseHeader } from "@tanstack/react-start/server";

export function applyReserveNoStoreHeadersServer() {
  setResponseHeader("Cache-Control", "private, no-store");
  setResponseHeader("X-Robots-Tag", "noindex, nofollow");
}
