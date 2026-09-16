import { dueNudgeDrafts, isDueNudgeDraft } from "@/lib/data/due-nudges";
import type { DataStore } from "@/lib/data/types";
import { deliverNudgeDraft } from "@/lib/email/deliver";
import type { SendNudgeDeps } from "@/lib/email/send";
import { todayStamp } from "@/lib/today";

export type SendDueNudgesResult = {
  ok: true;
  checked: number;
  sent: string[];
  failed: { id: string; error: string }[];
};

/**
 * Send draft nudges whose scheduledFor is due. Reuses the Resend path in deliverNudgeDraft.
 * Already-sent rows are never selected. Failures stay draft with lastError / sendAttempts.
 */
export async function sendDueNudges(
  store: DataStore,
  now: Date,
  deps: SendNudgeDeps = {},
): Promise<SendDueNudgesResult> {
  const due = dueNudgeDrafts(await store.listNudges(), now);
  const sent: string[] = [];
  const failed: { id: string; error: string }[] = [];
  const sentAt = todayStamp();

  for (const candidate of due) {
    const latest = (await store.listNudges()).find((nudge) => nudge.id === candidate.id);
    if (!latest || latest.status === "sent" || !isDueNudgeDraft(latest, now)) {
      continue;
    }

    const result = await deliverNudgeDraft(store, latest, sentAt, deps);
    if (result.ok) {
      sent.push(latest.id);
      continue;
    }
    await store.recordNudgeSendFailure(latest.id, result.error);
    failed.push({ id: latest.id, error: result.error });
  }

  return { ok: true, checked: due.length, sent, failed };
}
