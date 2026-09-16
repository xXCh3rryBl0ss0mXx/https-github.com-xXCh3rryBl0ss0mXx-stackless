import { createHash } from "node:crypto";
import type { DataStore, Nudge } from "@/lib/data/types";
import { sendNudgeEmail, type SendNudgeDeps, type SendNudgeResult } from "./send";
import { nudgeSubject } from "./templates";

const IDEMPOTENCY_HASH_LEN = 16;

/**
 * Resend keys are unique per HTTP method + endpoint for 24h; a changed body
 * with the same key is rejected. Hash the payload so identical retries stay
 * idempotent and edits (or a different recipient) get a fresh key.
 */
export function nudgeIdempotencyKey(
  nudgeId: string,
  to: string,
  subject: string,
  draftText: string,
): string {
  const hash = createHash("sha256")
    .update(`${to.trim()}|${subject}|${draftText.trim()}`)
    .digest("hex")
    .slice(0, IDEMPOTENCY_HASH_LEN);
  return `nudge/${nudgeId}/${hash}`;
}

export type RecipientResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export async function recipientForNudge(
  store: DataStore,
  nudge: Nudge,
): Promise<RecipientResult> {
  if (nudge.kind === "follow_up") {
    const lead = await store.getLead(nudge.relatedId);
    if (!lead) {
      return { ok: false, error: "Can’t find that person anymore." };
    }
    if (!lead.email.trim()) {
      return { ok: false, error: `${lead.name} has no email address, so we can’t send.` };
    }
    return { ok: true, email: lead.email };
  }

  const invoice = await store.getInvoice(nudge.relatedId);
  if (!invoice) {
    return { ok: false, error: "Can’t find that invoice anymore." };
  }
  if (!invoice.clientEmail.trim()) {
    return {
      ok: false,
      error: `${invoice.clientName} has no email address, so we can’t send.`,
    };
  }
  return { ok: true, email: invoice.clientEmail };
}

/**
 * Send via Resend, then mark the draft sent. On any failure the nudge stays a draft.
 */
export async function deliverNudgeDraft(
  store: DataStore,
  nudge: Nudge,
  sentAt: string,
  deps: SendNudgeDeps = {},
): Promise<SendNudgeResult> {
  if (nudge.status === "sent") {
    return { ok: true, id: "already-sent" };
  }

  const recipient = await recipientForNudge(store, nudge);
  if (!recipient.ok) return recipient;

  const sent = await sendNudgeEmail(
    {
      kind: nudge.kind,
      to: recipient.email,
      draftText: nudge.draftText,
      idempotencyKey: nudgeIdempotencyKey(
        nudge.id,
        recipient.email,
        nudgeSubject(nudge.kind),
        nudge.draftText,
      ),
    },
    deps,
  );
  if (!sent.ok) return sent;

  await store.markNudgeSent(nudge.id, sentAt);
  return sent;
}
