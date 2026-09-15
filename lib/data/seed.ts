import type { Invoice, Lead, Nudge } from "./types";

/** Matches data/leads.csv, invoices.csv, nudge_log.csv */

export const seedLeads: Lead[] = [
  {
    id: "lead_001",
    name: "Sam Lee",
    email: "sam@example.com",
    company: "Lee Studio",
    status: "waiting_on_them",
    lastContactAt: "2026-09-08",
    nextFollowUpAt: "2026-09-15",
    notes: "Sent website quote Monday",
    createdAt: "2026-09-01",
  },
  {
    id: "lead_002",
    name: "Jordan Kim",
    email: "jordan@example.com",
    status: "new",
    notes: "Asked about logo package",
    createdAt: "2026-09-12",
  },
];

export const seedInvoices: Invoice[] = [
  {
    id: "inv_001",
    clientName: "Sam Lee",
    clientEmail: "sam@example.com",
    invoiceNumber: "1042",
    amountUsd: 850,
    status: "open",
    dueDate: "2026-09-01",
    lastNudgedAt: "2026-09-10",
    paymentLink: "https://pay.example.com/1042",
    createdAt: "2026-08-15",
  },
  {
    id: "inv_002",
    clientName: "Alex Rivera",
    clientEmail: "alex@example.com",
    invoiceNumber: "1043",
    amountUsd: 1200,
    status: "paid",
    dueDate: "2026-08-20",
    paymentLink: "https://pay.example.com/1043",
    createdAt: "2026-08-01",
  },
];

export const seedNudges: Nudge[] = [
  {
    id: "nudge_001",
    kind: "follow_up",
    relatedId: "lead_001",
    channel: "email",
    draftText:
      "Hey Sam — just checking in on the website quote I sent Monday. Happy to tweak the scope if you want. Want to hop on a quick call this week?",
    status: "draft",
    scheduledFor: "2026-09-15",
    createdAt: "2026-09-14",
  },
  {
    id: "nudge_002",
    kind: "invoice",
    relatedId: "inv_001",
    channel: "email",
    draftText:
      "Hi Sam — friendly reminder that invoice #1042 ($850) is still open. I can resend the payment link if that helps. Thanks!",
    status: "sent",
    scheduledFor: "2026-09-10",
    sentAt: "2026-09-10",
    createdAt: "2026-09-09",
  },
];
