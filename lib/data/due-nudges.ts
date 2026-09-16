import { isScheduledDue } from "../schedule";
import type { Nudge } from "./types";

/** After this many failed cron sends, leave the draft and stop retrying. */
export const MAX_NUDGE_SEND_ATTEMPTS = 5;

export function isDueNudgeDraft(nudge: Nudge, now: Date): boolean {
  if (nudge.status !== "draft") return false;
  if ((nudge.sendAttempts ?? 0) >= MAX_NUDGE_SEND_ATTEMPTS) return false;
  return isScheduledDue(nudge.scheduledFor, now);
}

export function dueNudgeDrafts(nudges: Nudge[], now: Date): Nudge[] {
  return nudges.filter((nudge) => isDueNudgeDraft(nudge, now));
}
