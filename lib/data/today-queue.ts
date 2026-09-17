import { invoiceIsOverdue, leadNeedsFollowUp } from "./filters";
import type { Invoice, Lead, Nudge } from "./types";

export function latestDraft(nudges: Nudge[], relatedId: string): Nudge | undefined {
  return nudges.find((nudge) => nudge.relatedId === relatedId && nudge.status === "draft");
}

/** Newest nudge for this record decides if they stay in Due today. */
export function stillOnTodayList(nudges: Nudge[], relatedId: string, today: string): boolean {
  const latest = nudges.find((nudge) => nudge.relatedId === relatedId);
  if (!latest) return true;
  if (latest.status === "skipped") return false;
  if (latest.status === "sent" && latest.sentAt === today) return false;
  return true;
}

export type TodayQueueItem =
  | {
      kind: "follow_up";
      id: string;
      lead: Lead;
      draft?: Nudge;
      sortDate: string;
    }
  | {
      kind: "invoice";
      id: string;
      invoice: Invoice;
      draft?: Nudge;
      sortDate: string;
    };

export type DirectoryItem =
  | { kind: "follow_up"; id: string; lead: Lead; createdAt: string }
  | { kind: "invoice"; id: string; invoice: Invoice; createdAt: string };

export function buildTodayQueue(
  leads: Lead[],
  invoices: Invoice[],
  nudges: Nudge[],
  today: string,
): TodayQueueItem[] {
  const items: TodayQueueItem[] = [];
  for (const lead of leads) {
    if (!leadNeedsFollowUp(lead, today)) continue;
    if (!stillOnTodayList(nudges, lead.id, today)) continue;
    items.push({
      kind: "follow_up",
      id: lead.id,
      lead,
      draft: latestDraft(nudges, lead.id),
      // No date yet = always due; empty string sorts before YYYY-MM-DD.
      sortDate: lead.nextFollowUpAt ?? "",
    });
  }
  for (const invoice of invoices) {
    if (!invoiceIsOverdue(invoice, today)) continue;
    if (!stillOnTodayList(nudges, invoice.id, today)) continue;
    items.push({
      kind: "invoice",
      id: invoice.id,
      invoice,
      draft: latestDraft(nudges, invoice.id),
      sortDate: invoice.dueDate,
    });
  }
  return items.sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.id.localeCompare(b.id));
}

export function restOfRecords(
  leads: Lead[],
  invoices: Invoice[],
  dueIds: ReadonlySet<string>,
): DirectoryItem[] {
  const rest: DirectoryItem[] = [];
  for (const lead of leads) {
    if (dueIds.has(lead.id)) continue;
    rest.push({ kind: "follow_up", id: lead.id, lead, createdAt: lead.createdAt });
  }
  for (const invoice of invoices) {
    if (dueIds.has(invoice.id)) continue;
    rest.push({ kind: "invoice", id: invoice.id, invoice, createdAt: invoice.createdAt });
  }
  return rest.sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
}

export function splitRecentNudges(
  nudges: Nudge[],
  dueIds: ReadonlySet<string>,
  limit = 8,
): { strayDrafts: Nudge[]; history: Nudge[] } {
  const strayDrafts: Nudge[] = [];
  const history: Nudge[] = [];
  for (const nudge of nudges) {
    if (nudge.status === "draft") {
      if (!dueIds.has(nudge.relatedId)) strayDrafts.push(nudge);
    } else {
      history.push(nudge);
    }
  }
  return {
    strayDrafts: strayDrafts.slice(0, limit),
    history: history.slice(0, limit),
  };
}
