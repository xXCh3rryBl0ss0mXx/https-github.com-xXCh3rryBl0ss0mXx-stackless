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
  /** Last cron/send error. Stays a draft so the user can still send or edit. */
  lastError?: string;
  /** Failed auto-send tries. Cron stops after MAX_NUDGE_SEND_ATTEMPTS. */
  sendAttempts?: number;
};

export type NudgeDraftWrite = {
  draftText: string;
  /** Pass `""` to clear. Omit to leave the current schedule alone. */
  scheduledFor?: string;
};

export type StoreSnapshot = {
  leads: Lead[];
  invoices: Invoice[];
  nudges: Nudge[];
};

export type LeadWrite = {
  name: string;
  email: string;
  company?: string;
  status: LeadStatus;
  lastContactAt?: string;
  nextFollowUpAt?: string;
  notes?: string;
};

export type InvoiceWrite = {
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  amountUsd: number;
  status: InvoiceStatus;
  dueDate: string;
  paymentLink?: string;
};

export type DataStore = {
  listLeads(): Promise<Lead[]>;
  listLeadsNeedingFollowUp(today: string): Promise<Lead[]>;
  listInvoices(): Promise<Invoice[]>;
  listOpenInvoices(): Promise<Invoice[]>;
  listOverdueInvoices(today: string): Promise<Invoice[]>;
  listNudges(): Promise<Nudge[]>;
  getLead(id: string): Promise<Lead | null>;
  getInvoice(id: string): Promise<Invoice | null>;
  createLead(input: LeadWrite): Promise<Lead>;
  updateLead(id: string, input: LeadWrite): Promise<Lead>;
  /** Removes the lead and any draft nudges for it. Sent/skipped history stays. */
  deleteLead(id: string): Promise<void>;
  createInvoice(input: InvoiceWrite): Promise<Invoice>;
  updateInvoice(id: string, input: InvoiceWrite): Promise<Invoice>;
  /** Removes the invoice and any draft nudges for it. Sent/skipped history stays. */
  deleteInvoice(id: string): Promise<void>;
  createNudgeDraft(input: {
    kind: NudgeKind;
    relatedId: string;
    draftText: string;
    scheduledFor?: string;
  }): Promise<Nudge>;
  updateNudgeDraft(id: string, input: NudgeDraftWrite): Promise<Nudge>;
  /** Stay draft; bump sendAttempts and lastError so cron can skip after N failures. */
  recordNudgeSendFailure(id: string, error: string): Promise<void>;
  markNudgeSent(id: string, sentAt: string): Promise<void>;
  markNudgeSkipped(id: string): Promise<void>;
};
