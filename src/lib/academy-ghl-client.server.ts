/** HighLevel v3 private integration transport. Credentials never enter browser code. */
export class GhlTransportError extends Error {
  constructor() { super("GHL_REQUEST_OUTCOME_UNKNOWN"); }
}
export function createGhlClient(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = globalThis.fetch,
) {
  const token = env.ACADEMY_GHL_PRIVATE_TOKEN?.trim();
  const locationId = env.ACADEMY_GHL_LOCATION_ID?.trim();
  if (!token || !locationId || !/^[a-zA-Z0-9_-]{10,100}$/.test(locationId))
    throw new Error("GHL_PRIVATE_INTEGRATION_NOT_CONFIGURED");
  return {
    locationId,
    async request(path: string, options: {
      method?: "GET" | "POST" | "PUT";
      query?: Record<string, string>;
      body?: unknown;
    } = {}): Promise<Response> {
      if (!/^\/[a-zA-Z0-9/_-]+$/.test(path) || path.startsWith("//"))
        throw new Error("GHL_INVALID_API_PATH");
      const url = new URL(path, "https://services.leadconnectorhq.com");
      for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value);
      try {
        return await fetchImpl(url, {
          method: options.method ?? "GET",
          redirect: "error",
          signal: AbortSignal.timeout(10000),
          headers: {
            Authorization: `Bearer ${token}`, Version: "v3", Accept: "application/json",
            ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
          },
          ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        });
      } catch { throw new GhlTransportError(); }
    },
  };
}
