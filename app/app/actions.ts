"use server";

import { revalidatePath } from "next/cache";
import { followUpDraftText, invoiceDraftText } from "@/lib/data/draft-text";
import { invoiceWriteFromForm, leadWriteFromForm } from "@/lib/data/record-input";
import { getDataStore } from "@/lib/data/store";
import type { Nudge, NudgeKind } from "@/lib/data/types";
import { deliverNudgeDraft } from "@/lib/email/deliver";
import { assertPaidAccess, requirePaidAccess } from "@/lib/stripe/billing";
import { scheduledForFromInput } from "@/lib/schedule";
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

function readScheduledFor(formData: FormData): string | undefined {
  return scheduledForFromInput(String(formData.get("scheduledFor") ?? ""));
}

async function upsertDraft(formData: FormData): Promise<Nudge> {
  const kind = readKind(formData);
  const relatedId = String(formData.get("relatedId") ?? "");
  const nudgeId = String(formData.get("nudgeId") ?? "");
  const typed = String(formData.get("draftText") ?? "").trim();
  const scheduledFor = readScheduledFor(formData);
  const store = getDataStore();
  const text = typed || (await defaultDraftText(kind, relatedId));
  const nudges = await store.listNudges();
  const existing =
    (nudgeId ? nudges.find((nudge) => nudge.id === nudgeId && nudge.status === "draft") : undefined) ??
    latestDraft(nudges, relatedId);

  if (existing) {
    return store.updateNudgeDraft(existing.id, {
      draftText: text,
      scheduledFor: scheduledFor ?? "",
    });
  }
  return store.createNudgeDraft({
    kind,
    relatedId,
    draftText: text,
    scheduledFor,
  });
}

export async function saveDraftAction(formData: FormData) {
  await assertPaidAccess();
  await upsertDraft(formData);
  revalidatePath("/app");
}

export type SendNudgeActionState = { ok: true } | { ok: false; error: string };

export async function sendNudgeAction(
  _prev: SendNudgeActionState | null,
  formData: FormData,
): Promise<SendNudgeActionState> {
  const access = await requirePaidAccess();
  if (!access.ok) return { ok: false, error: access.error };
  try {
    const nudgeId = String(formData.get("nudgeId") ?? "");
    const store = getDataStore();
    if (nudgeId) {
      const existing = (await store.listNudges()).find((nudge) => nudge.id === nudgeId);
      if (existing?.status === "sent") {
        return { ok: false, error: "This one was already sent." };
      }
    }
    const draft = await upsertDraft(formData);
    const result = await deliverNudgeDraft(store, draft, todayStamp());
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/app");
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong sending this email.";
    return { ok: false, error: message };
  }
}

export async function skipAction(formData: FormData) {
  await assertPaidAccess();
  const draft = await upsertDraft(formData);
  await getDataStore().markNudgeSkipped(draft.id);
  revalidatePath("/app");
}

export type RecordActionState = { ok: true } | { ok: false; error: string };

function recordFail(err: unknown, fallback = "Couldn’t save that."): RecordActionState {
  return {
    ok: false,
    error: err instanceof Error ? err.message : fallback,
  };
}

export async function createLeadAction(
  _prev: RecordActionState | null,
  formData: FormData,
): Promise<RecordActionState> {
  const access = await requirePaidAccess();
  if (!access.ok) return access;
  try {
    await getDataStore().createLead(leadWriteFromForm(formData));
    revalidatePath("/app");
    return { ok: true };
  } catch (err) {
    return recordFail(err);
  }
}

export async function updateLeadAction(
  _prev: RecordActionState | null,
  formData: FormData,
): Promise<RecordActionState> {
  const access = await requirePaidAccess();
  if (!access.ok) return access;
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("Missing lead id.");
    await getDataStore().updateLead(id, leadWriteFromForm(formData));
    revalidatePath("/app");
    return { ok: true };
  } catch (err) {
    return recordFail(err);
  }
}

export async function createInvoiceAction(
  _prev: RecordActionState | null,
  formData: FormData,
): Promise<RecordActionState> {
  const access = await requirePaidAccess();
  if (!access.ok) return access;
  try {
    await getDataStore().createInvoice(invoiceWriteFromForm(formData));
    revalidatePath("/app");
    return { ok: true };
  } catch (err) {
    return recordFail(err);
  }
}

export async function updateInvoiceAction(
  _prev: RecordActionState | null,
  formData: FormData,
): Promise<RecordActionState> {
  const access = await requirePaidAccess();
  if (!access.ok) return access;
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("Missing invoice id.");
    await getDataStore().updateInvoice(id, invoiceWriteFromForm(formData));
    revalidatePath("/app");
    return { ok: true };
  } catch (err) {
    return recordFail(err);
  }
}

export async function deleteLeadAction(
  _prev: RecordActionState | null,
  formData: FormData,
): Promise<RecordActionState> {
  const access = await requirePaidAccess();
  if (!access.ok) return access;
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("Missing lead id.");
    await getDataStore().deleteLead(id);
    revalidatePath("/app");
    return { ok: true };
  } catch (err) {
    return recordFail(err, "Couldn’t delete that.");
  }
}

export async function deleteInvoiceAction(
  _prev: RecordActionState | null,
  formData: FormData,
): Promise<RecordActionState> {
  const access = await requirePaidAccess();
  if (!access.ok) return access;
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("Missing invoice id.");
    await getDataStore().deleteInvoice(id);
    revalidatePath("/app");
    return { ok: true };
  } catch (err) {
    return recordFail(err, "Couldn’t delete that.");
  }
}
