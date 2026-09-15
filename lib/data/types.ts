/** Thin data-layer — app code talks to DataStore, not Sheets columns. */

export type LeadStatus =
  | "new"
  | "waiting_on_them"
  | "waiting_on_you"
  | "won"
  | "lost";

export type InvoiceStatus = "open" | "paid" | "void";
export type NudgeKind = "follow_up" | "invoice";
export type NudgeStatus = "draft" | "sent" | "skipped";
export type Channel = "email"; // SMS later

export type Lead = {
  id: string;
  name: string;
  email: string;
  company?: string;
  status: LeadStatus;
  lastContactAt?: string; // YYYY-MM-DD
  nextFollowUpAt?: string;
  notes?: string;
  createdAt: string;
};

export type Invoice = {
  id: string;
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  amountUsd: number;
  status: InvoiceStatus;
  dueDate: string;
  lastNudgedAt?: string;
  paymentLink?: string;
  createdAt: string;
};

export type Nudge = {
  id: string;
  kind: NudgeKind;
  relatedId: string;
  channel: Channel;
  draftText: string;
  status: NudgeStatus;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
};

export type StoreSnapshot = {
  leads: Lead[];
  invoices: Invoice[];
  nudges: Nudge[];
};

export type DataStore = {
  listLeadsNeedingFollowUp(today: string): Promise<Lead[]>;
  listOpenInvoices(): Promise<Invoice[]>;
  listOverdueInvoices(today: string): Promise<Invoice[]>;
  listNudges(): Promise<Nudge[]>;
  getLead(id: string): Promise<Lead | null>;
  getInvoice(id: string): Promise<Invoice | null>;
  createNudgeDraft(input: {
    kind: NudgeKind;
    relatedId: string;
    draftText: string;
    scheduledFor?: string;
  }): Promise<Nudge>;
  updateNudgeDraft(id: string, draftText: string): Promise<Nudge>;
  markNudgeSent(id: string, sentAt: string): Promise<void>;
  markNudgeSkipped(id: string): Promise<void>;
};
