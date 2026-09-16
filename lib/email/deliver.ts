import type { DataStore, Nudge } from "@/lib/data/types";
import { sendNudgeEmail, type SendNudgeDeps, type SendNudgeResult } from "./send";

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
      idempotencyKey: `nudge/${nudge.id}`,
    },
    deps,
  );
  if (!sent.ok) return sent;

  await store.markNudgeSent(nudge.id, sentAt);
  return sent;
}
