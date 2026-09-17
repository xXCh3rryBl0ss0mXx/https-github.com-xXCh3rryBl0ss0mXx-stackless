import type { Invoice, InvoiceStatus, InvoiceWrite, Lead, LeadStatus, LeadWrite } from "./types";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "waiting_on_them",
  "waiting_on_you",
  "won",
  "lost",
];

export const INVOICE_STATUSES: InvoiceStatus[] = ["open", "paid", "void"];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function read(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function optional(value: string): string | undefined {
  return value || undefined;
}

function requireDate(value: string, label: string): string {
  if (!DATE.test(value)) {
    throw new Error(`${label} must be a date (YYYY-MM-DD).`);
  }
  return value;
}

function optionalDate(value: string, label: string): string | undefined {
  if (!value) return undefined;
  return requireDate(value, label);
}

function requireEmail(value: string, label: string): string {
  if (!value) throw new Error(`${label} is required.`);
  if (!value.includes("@")) throw new Error(`That ${label.toLowerCase()} doesn’t look right.`);
  return value;
}

export function leadWriteFromForm(formData: FormData): LeadWrite {
  const name = read(formData, "name");
  const email = requireEmail(read(formData, "email"), "Email");
  const statusRaw = read(formData, "status");
  const status = (statusRaw || "new") as LeadStatus;
  if (!name) throw new Error("Name is required.");
  if (!LEAD_STATUSES.includes(status)) throw new Error("Pick a lead status.");
  return {
    name,
    email,
    company: optional(read(formData, "company")),
    status,
    lastContactAt: optionalDate(read(formData, "lastContactAt"), "Last contact"),
    nextFollowUpAt: optionalDate(read(formData, "nextFollowUpAt"), "Follow-up date"),
    notes: optional(read(formData, "notes")),
  };
}

export function invoiceWriteFromForm(formData: FormData): InvoiceWrite {
  const clientName = read(formData, "clientName");
  const clientEmail = requireEmail(read(formData, "clientEmail"), "Client email");
  const invoiceNumber = read(formData, "invoiceNumber");
  const amountRaw = read(formData, "amountUsd");
  const statusRaw = read(formData, "status");
  const status = (statusRaw || "open") as InvoiceStatus;
  const dueDate = read(formData, "dueDate");
  if (!clientName) throw new Error("Client name is required.");
  if (!invoiceNumber) throw new Error("Invoice number is required.");
  if (!INVOICE_STATUSES.includes(status)) throw new Error("Pick an invoice status.");
  const amountUsd = Number(amountRaw);
  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    throw new Error("Amount must be a number (no $ sign).");
  }
  return {
    clientName,
    clientEmail,
    invoiceNumber,
    amountUsd,
    status,
    dueDate: requireDate(dueDate, "Due date"),
    paymentLink: optional(read(formData, "paymentLink")),
  };
}

function setOptional<T, K extends keyof T>(obj: T, key: K, value: T[K] | undefined): void {
  if (value === undefined || value === "") {
    delete obj[key];
  } else {
    obj[key] = value;
  }
}

export function applyLeadWrite(lead: Lead, input: LeadWrite): void {
  lead.name = input.name;
  lead.email = input.email;
  lead.status = input.status;
  setOptional(lead, "company", input.company);
  setOptional(lead, "lastContactAt", input.lastContactAt);
  setOptional(lead, "nextFollowUpAt", input.nextFollowUpAt);
  setOptional(lead, "notes", input.notes);
}

export function applyInvoiceWrite(invoice: Invoice, input: InvoiceWrite): void {
  invoice.clientName = input.clientName;
  invoice.clientEmail = input.clientEmail;
  invoice.invoiceNumber = input.invoiceNumber;
  invoice.amountUsd = input.amountUsd;
  invoice.status = input.status;
  invoice.dueDate = input.dueDate;
  setOptional(invoice, "paymentLink", input.paymentLink);
}
