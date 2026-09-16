import type { InvoiceStatus, LeadStatus } from "./types";

export function leadStatusLabel(status: LeadStatus): string {
  if (status === "waiting_on_them") return "Waiting on them";
  if (status === "waiting_on_you") return "Waiting on you";
  if (status === "new") return "New";
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  return status;
}

export function invoiceStatusLabel(status: InvoiceStatus): string {
  if (status === "open") return "Open";
  if (status === "paid") return "Paid";
  if (status === "void") return "Void";
  return status;
}
