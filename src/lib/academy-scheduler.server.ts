import { createHash } from "node:crypto";

type SchedulerDatabase = {
  rpc(
    name: "academy_scheduler_authorized",
    args: { p_token_sha256: string },
  ): PromiseLike<{ data: unknown; error: unknown }>;
};

/** The old environment bearer has been retired. Only the current DB credential works. */
export async function schedulerAuthorized(
  request: Request,
  database: () => SchedulerDatabase,
): Promise<boolean> {
  const match = /^Bearer ([0-9a-f]{64})$/.exec(request.headers.get("authorization") ?? "");
  if (!match) return false;
  try {
    const { data, error } = await database().rpc("academy_scheduler_authorized", {
      p_token_sha256: createHash("sha256").update(match[1], "utf8").digest("hex"),
    });
    return !error && data === true;
  } catch {
    return false;
  }
}
