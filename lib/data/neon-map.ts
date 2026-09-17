import { INVOICE_STATUSES, LEAD_STATUSES } from "./record-input";
import type {
  Invoice,
  InvoiceStatus,
  Lead,
  LeadStatus,
  Nudge,
  NudgeKind,
  NudgeStatus,
} from "./types";

const NUDGE_KINDS = new Set<NudgeKind>(["follow_up", "invoice"]);
const NUDGE_STATUSES = new Set<NudgeStatus>(["draft", "sent", "skipped"]);

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function optionalText(value: unknown): string | undefined {
  const text = asText(value).trim();
  return text || undefined;
}

function requireText(row: Record<string, unknown>, column: string, label: string): string {
  const text = asText(row[column]).trim();
  if (!text) {
    throw new Error(`${label} is missing column "${column}".`);
  }
  return text;
}

function optionalInt(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
}

function omitUndefined<T extends object>(value: T): T {
  const next = { ...value };
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (next[key] === undefined) delete next[key];
  }
  return next;
}

function parseLeadStatus(raw: unknown): LeadStatus {
  const value = asText(raw).trim() as LeadStatus;
  return LEAD_STATUSES.includes(value) ? value : "new";
}

function parseInvoiceStatus(raw: unknown): InvoiceStatus {
  const value = asText(raw).trim() as InvoiceStatus;
  return INVOICE_STATUSES.includes(value) ? value : "open";
}

export function leadFromDb(row: Record<string, unknown>): Lead {
  return omitUndefined({
    id: requireText(row, "id", "Lead row"),
    name: requireText(row, "name", "Lead row"),
    email: requireText(row, "email", "Lead row"),
    company: optionalText(row.company),
    status: parseLeadStatus(row.status),
    lastContactAt: optionalText(row.last_contact_at),
    nextFollowUpAt: optionalText(row.next_follow_up_at),
    notes: optionalText(row.notes),
    createdAt: requireText(row, "created_at", "Lead row"),
  });
}

export function invoiceFromDb(row: Record<string, unknown>): Invoice {
  const amountUsd = typeof row.amount_usd === "number" ? row.amount_usd : Number(row.amount_usd);
  if (!Number.isFinite(amountUsd)) {
    throw new Error(`Invoice row ${asText(row.id) || "(missing id)"} has a bad amount_usd.`);
  }
  return omitUndefined({
    id: requireText(row, "id", "Invoice row"),
    clientName: requireText(row, "client_name", "Invoice row"),
    clientEmail: requireText(row, "client_email", "Invoice row"),
    invoiceNumber: requireText(row, "invoice_number", "Invoice row"),
    amountUsd,
    status: parseInvoiceStatus(row.status),
    dueDate: requireText(row, "due_date", "Invoice row"),
    lastNudgedAt: optionalText(row.last_nudged_at),
    paymentLink: optionalText(row.payment_link),
    createdAt: requireText(row, "created_at", "Invoice row"),
  });
}

export function nudgeFromDb(row: Record<string, unknown>): Nudge {
  const kind = asText(row.kind).trim() as NudgeKind;
  const status = asText(row.status).trim() as NudgeStatus;
  if (!NUDGE_KINDS.has(kind)) {
    throw new Error(`Nudge row ${asText(row.id) || "(missing id)"} has a bad kind.`);
  }
  if (!NUDGE_STATUSES.has(status)) {
    throw new Error(`Nudge row ${asText(row.id) || "(missing id)"} has a bad status.`);
  }
  return omitUndefined({
    id: requireText(row, "id", "Nudge row"),
    kind,
    relatedId: requireText(row, "related_id", "Nudge row"),
    channel: "email" as const,
    draftText: asText(row.draft_text),
    status,
    scheduledFor: optionalText(row.scheduled_for),
    sentAt: optionalText(row.sent_at),
    createdAt: requireText(row, "created_at", "Nudge row"),
    lastError: optionalText(row.last_error),
    sendAttempts: optionalInt(row.send_attempts),
  });
}

export function leadToDb(lead: Lead): Record<string, unknown> {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    company: lead.company ?? null,
    status: lead.status,
    last_contact_at: lead.lastContactAt ?? null,
    next_follow_up_at: lead.nextFollowUpAt ?? null,
    notes: lead.notes ?? null,
    created_at: lead.createdAt,
  };
}

export function invoiceToDb(invoice: Invoice): Record<string, unknown> {
  return {
    id: invoice.id,
    client_name: invoice.clientName,
    client_email: invoice.clientEmail,
    invoice_number: invoice.invoiceNumber,
    amount_usd: invoice.amountUsd,
    status: invoice.status,
    due_date: invoice.dueDate,
    last_nudged_at: invoice.lastNudgedAt ?? null,
    payment_link: invoice.paymentLink ?? null,
    created_at: invoice.createdAt,
  };
}

export function nudgeToDb(nudge: Nudge): Record<string, unknown> {
  return {
    id: nudge.id,
    kind: nudge.kind,
    related_id: nudge.relatedId,
    channel: nudge.channel,
    draft_text: nudge.draftText,
    status: nudge.status,
    scheduled_for: nudge.scheduledFor ?? null,
    sent_at: nudge.sentAt ?? null,
    created_at: nudge.createdAt,
    last_error: nudge.lastError ?? null,
    send_attempts: nudge.sendAttempts ?? null,
  };
}

export const LEAD_DB_COLUMNS = [
  "id",
  "name",
  "email",
  "company",
  "status",
  "last_contact_at",
  "next_follow_up_at",
  "notes",
  "created_at",
] as const;

export const INVOICE_DB_COLUMNS = [
  "id",
  "client_name",
  "client_email",
  "invoice_number",
  "amount_usd",
  "status",
  "due_date",
  "last_nudged_at",
  "payment_link",
  "created_at",
] as const;

export const NUDGE_DB_COLUMNS = [
  "id",
  "kind",
  "related_id",
  "channel",
  "draft_text",
  "status",
  "scheduled_for",
  "sent_at",
  "created_at",
  "last_error",
  "send_attempts",
] as const;

export function dbValues(
  row: Record<string, unknown>,
  columns: readonly string[],
): unknown[] {
  return columns.map((column) => row[column] ?? null);
}

export function sqlPlaceholders(count: number): string {
  return Array.from({ length: count }, (_, index) => `$${index + 1}`).join(", ");
}
