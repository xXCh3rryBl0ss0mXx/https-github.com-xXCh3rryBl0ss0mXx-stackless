import { ownerIdOf } from "./owner";
import type {
  Invoice,
  InvoiceStatus,
  Lead,
  LeadStatus,
  Nudge,
  NudgeKind,
  NudgeStatus,
} from "./types";

export const LEAD_TAB = "leads";
export const INVOICE_TAB = "invoices";
export const NUDGE_TAB = "nudge_log";

export const LEAD_COLUMNS = [
  "id",
  "name",
  "email",
  "company",
  "status",
  "last_contact_at",
  "next_follow_up_at",
  "notes",
  "created_at",
  "user_id",
] as const;

export const INVOICE_COLUMNS = [
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
  "user_id",
] as const;

export const NUDGE_COLUMNS = [
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
  "user_id",
] as const;

export const LEAD_REQUIRED_COLUMNS = ["id", "name", "email", "status", "created_at"] as const;
export const INVOICE_REQUIRED_COLUMNS = [
  "id",
  "client_name",
  "client_email",
  "invoice_number",
  "amount_usd",
  "status",
  "due_date",
  "created_at",
] as const;
export const NUDGE_REQUIRED_COLUMNS = [
  "id",
  "kind",
  "related_id",
  "channel",
  "draft_text",
  "status",
  "created_at",
] as const;

export type SheetTable = {
  headers: string[];
  rows: string[][];
};

const LEAD_STATUSES = new Set<LeadStatus>([
  "new",
  "waiting_on_them",
  "waiting_on_you",
  "won",
  "lost",
]);
const INVOICE_STATUSES = new Set<InvoiceStatus>(["open", "paid", "void"]);
const NUDGE_KINDS = new Set<NudgeKind>(["follow_up", "invoice"]);
const NUDGE_STATUSES = new Set<NudgeStatus>(["draft", "sent", "skipped"]);

function blankToUndef(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : undefined;
}

function parseSendAttempts(value: string | undefined): number | undefined {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
}

function requireCell(row: Record<string, string>, column: string, label: string): string {
  const value = row[column]?.trim() ?? "";
  if (!value) {
    throw new Error(`${label} is missing column "${column}".`);
  }
  return value;
}

export function zipRow(headers: string[], cells: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  for (let i = 0; i < headers.length; i += 1) {
    const header = headers[i]?.trim();
    if (!header) continue;
    row[header] = cells[i] ?? "";
  }
  return row;
}

/** Write known fields; leave extra sheet columns untouched. */
export function fieldsToCells(
  headers: string[],
  fields: Record<string, string>,
  existing?: string[],
): string[] {
  return headers.map((header, index) => {
    if (Object.prototype.hasOwnProperty.call(fields, header)) {
      return fields[header] ?? "";
    }
    return existing?.[index] ?? "";
  });
}

export function assertColumns(tab: string, headers: string[], required: readonly string[]): void {
  const present = new Set(headers.map((header) => header.trim()));
  const missing = required.filter((column) => !present.has(column));
  if (missing.length > 0) {
    throw new Error(
      `Google Sheet tab "${tab}" is missing column${missing.length === 1 ? "" : "s"} ${missing
        .map((column) => `"${column}"`)
        .join(", ")}. Keep the header names from data/README.md.`,
    );
  }
}

export function parseLeadStatus(raw: string | undefined): LeadStatus {
  const value = raw?.trim() as LeadStatus | undefined;
  if (value && LEAD_STATUSES.has(value)) return value;
  return "new";
}

export function parseInvoiceStatus(raw: string | undefined): InvoiceStatus {
  const value = raw?.trim() as InvoiceStatus | undefined;
  if (value && INVOICE_STATUSES.has(value)) return value;
  return "open";
}

function omitUndefined<T extends object>(value: T): T {
  const next = { ...value };
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (next[key] === undefined) delete next[key];
  }
  return next;
}

export function leadFromRow(row: Record<string, string>): Lead {
  return omitUndefined({
    id: requireCell(row, "id", "Lead row"),
    userId: ownerIdOf(row.user_id),
    name: requireCell(row, "name", "Lead row"),
    email: requireCell(row, "email", "Lead row"),
    company: blankToUndef(row.company),
    status: parseLeadStatus(row.status),
    lastContactAt: blankToUndef(row.last_contact_at),
    nextFollowUpAt: blankToUndef(row.next_follow_up_at),
    notes: blankToUndef(row.notes),
    createdAt: requireCell(row, "created_at", "Lead row"),
  });
}

export function invoiceFromRow(row: Record<string, string>): Invoice {
  const amountRaw = row.amount_usd?.trim() ?? "";
  const amountUsd = Number(amountRaw);
  if (!Number.isFinite(amountUsd)) {
    throw new Error(`Invoice row ${row.id ?? "(missing id)"} has a bad amount_usd.`);
  }
  return omitUndefined({
    id: requireCell(row, "id", "Invoice row"),
    userId: ownerIdOf(row.user_id),
    clientName: requireCell(row, "client_name", "Invoice row"),
    clientEmail: requireCell(row, "client_email", "Invoice row"),
    invoiceNumber: requireCell(row, "invoice_number", "Invoice row"),
    amountUsd,
    status: parseInvoiceStatus(row.status),
    dueDate: requireCell(row, "due_date", "Invoice row"),
    lastNudgedAt: blankToUndef(row.last_nudged_at),
    paymentLink: blankToUndef(row.payment_link),
    createdAt: requireCell(row, "created_at", "Invoice row"),
  });
}

export function nudgeFromRow(row: Record<string, string>): Nudge {
  const kind = row.kind?.trim() as NudgeKind | undefined;
  const status = row.status?.trim() as NudgeStatus | undefined;
  if (!kind || !NUDGE_KINDS.has(kind)) {
    throw new Error(`Nudge row ${row.id ?? "(missing id)"} has a bad kind.`);
  }
  if (!status || !NUDGE_STATUSES.has(status)) {
    throw new Error(`Nudge row ${row.id ?? "(missing id)"} has a bad status.`);
  }
  return omitUndefined({
    id: requireCell(row, "id", "Nudge row"),
    userId: ownerIdOf(row.user_id),
    kind,
    relatedId: requireCell(row, "related_id", "Nudge row"),
    channel: "email" as const,
    draftText: row.draft_text ?? "",
    status,
    scheduledFor: blankToUndef(row.scheduled_for),
    sentAt: blankToUndef(row.sent_at),
    createdAt: requireCell(row, "created_at", "Nudge row"),
    lastError: blankToUndef(row.last_error),
    sendAttempts: parseSendAttempts(row.send_attempts),
  });
}

export function leadToFields(lead: Lead): Record<string, string> {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    company: lead.company ?? "",
    status: lead.status,
    last_contact_at: lead.lastContactAt ?? "",
    next_follow_up_at: lead.nextFollowUpAt ?? "",
    notes: lead.notes ?? "",
    created_at: lead.createdAt,
    user_id: lead.userId ?? "",
  };
}

export function invoiceToFields(invoice: Invoice): Record<string, string> {
  return {
    id: invoice.id,
    client_name: invoice.clientName,
    client_email: invoice.clientEmail,
    invoice_number: invoice.invoiceNumber,
    amount_usd: String(invoice.amountUsd),
    status: invoice.status,
    due_date: invoice.dueDate,
    last_nudged_at: invoice.lastNudgedAt ?? "",
    payment_link: invoice.paymentLink ?? "",
    created_at: invoice.createdAt,
    user_id: invoice.userId ?? "",
  };
}

export function nudgeToFields(nudge: Nudge): Record<string, string> {
  return {
    id: nudge.id,
    kind: nudge.kind,
    related_id: nudge.relatedId,
    channel: nudge.channel,
    draft_text: nudge.draftText,
    status: nudge.status,
    scheduled_for: nudge.scheduledFor ?? "",
    sent_at: nudge.sentAt ?? "",
    created_at: nudge.createdAt,
    last_error: nudge.lastError ?? "",
    send_attempts: nudge.sendAttempts != null ? String(nudge.sendAttempts) : "",
    user_id: nudge.userId ?? "",
  };
}

export function parseTableRows<T>(
  tab: string,
  table: SheetTable,
  required: readonly string[],
  mapRow: (row: Record<string, string>) => T,
): T[] {
  assertColumns(tab, table.headers, required);
  const records: T[] = [];
  for (const cells of table.rows) {
    const row = zipRow(table.headers, cells);
    if (!row.id?.trim()) continue;
    records.push(mapRow(row));
  }
  return records;
}

export function findOwnedRowIndex(
  headers: string[],
  rows: string[][],
  id: string,
  userId: string,
): number {
  const idCol = headers.findIndex((header) => header.trim() === "id");
  const userCol = headers.findIndex((header) => header.trim() === "user_id");
  if (idCol < 0) {
    throw new Error('Sheet is missing an "id" column.');
  }
  if (userCol < 0) return -1;
  const owner = userId.trim();
  if (!owner) return -1;
  return rows.findIndex(
    (cells) =>
      (cells[idCol] ?? "").trim() === id && (cells[userCol] ?? "").trim() === owner,
  );
}

export function assertOwnerColumn(tab: string, headers: string[]): void {
  const present = headers.some((header) => header.trim() === "user_id");
  if (!present) {
    throw new Error(
      `Google Sheet tab "${tab}" is missing column "user_id". Add it so each row stays private to one Clerk user.`,
    );
  }
}
