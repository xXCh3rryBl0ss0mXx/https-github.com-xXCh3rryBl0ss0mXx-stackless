import type { Invoice, Lead } from "./types";

export function leadNeedsFollowUp(lead: Lead, today: string): boolean {
  if (lead.status === "won" || lead.status === "lost") return false;
  if (!lead.nextFollowUpAt) return true;
  return lead.nextFollowUpAt <= today;
}

export function invoiceIsOpen(invoice: Invoice): boolean {
  return invoice.status === "open";
}

export function invoiceIsOverdue(invoice: Invoice, today: string): boolean {
  return invoice.status === "open" && invoice.dueDate <= today;
}

export function newestFirst<T extends { createdAt: string; id: string }>(rows: T[]): T[] {
  return rows
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}
