import { CHALLENGE_START_ISO } from "./challenge-config";

export interface CountdownState {
  started: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function computeCountdown(
  now: number,
  targetIso: string = CHALLENGE_START_ISO,
): CountdownState {
  const target = new Date(targetIso).getTime();
  const diffMs = target - now;
  if (diffMs <= 0) {
    return { started: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { started: false, days, hours, minutes, seconds };
}
