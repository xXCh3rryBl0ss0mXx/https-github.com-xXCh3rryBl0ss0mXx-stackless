"use server";

import { revalidatePath } from "next/cache";
import { followUpDraftText, invoiceDraftText } from "@/lib/data/draft-text";
import { getDataStore } from "@/lib/data/store";
import type { Nudge, NudgeKind } from "@/lib/data/types";
import { requireSignedIn } from "@/lib/require-signed-in";
import { todayStamp } from "@/lib/today";

function readKind(formData: FormData): NudgeKind {
  const kind = String(formData.get("kind") ?? "");
  if (kind !== "follow_up" && kind !== "invoice") {
    throw new Error("Unknown nudge kind");
  }
  return kind;
}

function latestDraft(nudges: Nudge[], relatedId: string): Nudge | undefined {
  return nudges.find((nudge) => nudge.relatedId === relatedId && nudge.status === "draft");
}

async function defaultDraftText(kind: NudgeKind, relatedId: string): Promise<string> {
  const store = getDataStore();
  if (kind === "follow_up") {
    const lead = await store.getLead(relatedId);
    if (!lead) throw new Error("No lead with that id");
    return followUpDraftText(lead);
  }
  const invoice = await store.getInvoice(relatedId);
  if (!invoice) throw new Error("No invoice with that id");
  return invoiceDraftText(invoice);
}

async function upsertDraft(formData: FormData): Promise<Nudge> {
  const kind = readKind(formData);
  const relatedId = String(formData.get("relatedId") ?? "");
  const nudgeId = String(formData.get("nudgeId") ?? "");
  const typed = String(formData.get("draftText") ?? "").trim();
  const store = getDataStore();
  const text = typed || (await defaultDraftText(kind, relatedId));
  const nudges = await store.listNudges();
  const existing =
    (nudgeId ? nudges.find((nudge) => nudge.id === nudgeId && nudge.status === "draft") : undefined) ??
    latestDraft(nudges, relatedId);

  if (existing) {
    return store.updateNudgeDraft(existing.id, text);
  }
  return store.createNudgeDraft({
    kind,
    relatedId,
    draftText: text,
    scheduledFor: todayStamp(),
  });
}

export async function saveDraftAction(formData: FormData) {
  await requireSignedIn();
  await upsertDraft(formData);
  revalidatePath("/app");
}

export async function markSentAction(formData: FormData) {
  await requireSignedIn();
  const draft = await upsertDraft(formData);
  await getDataStore().markNudgeSent(draft.id, todayStamp());
  revalidatePath("/app");
}

export async function skipAction(formData: FormData) {
  await requireSignedIn();
  const draft = await upsertDraft(formData);
  await getDataStore().markNudgeSkipped(draft.id);
  revalidatePath("/app");
}
