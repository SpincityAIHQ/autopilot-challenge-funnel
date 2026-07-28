import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isValidReservationToken } from "@/lib/reservation-token";
import type { ReservationLookup } from "@/lib/reservation.server";

export const getReservationByToken = createServerFn({ method: "GET" })
  .inputValidator((raw: { token: string }) =>
    z.object({ token: z.string() }).parse(raw),
  )
  .handler(async ({ data }): Promise<ReservationLookup | null> => {
    if (!isValidReservationToken(data.token)) return null;
    const { lookupReservationByToken } = await import(
      "@/lib/reservation.server"
    );
    return lookupReservationByToken(data.token);
  });
