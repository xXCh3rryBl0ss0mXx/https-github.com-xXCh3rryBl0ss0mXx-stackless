import { clipError } from "../schedule";
import { todayStamp } from "../today";
import { invoiceIsOpen, invoiceIsOverdue, leadNeedsFollowUp, newestFirst } from "./filters";
import { nextPrefixedId } from "./ids";
import { applyInvoiceWrite, applyLeadWrite } from "./record-input";
import type {
  DataStore,
  Invoice,
  InvoiceWrite,
  Lead,
  LeadWrite,
  Nudge,
  NudgeDraftWrite,
  NudgeKind,
  StoreSnapshot,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class MemoryDataStore implements DataStore {
  private leads: Lead[];
  private invoices: Invoice[];
  private nudges: Nudge[];
  private persist?: (snapshot: StoreSnapshot) => void;

  constructor(
    seed?: StoreSnapshot,
    persist?: (snapshot: StoreSnapshot) => void,
  ) {
    this.leads = clone(seed?.leads ?? []);
    this.invoices = clone(seed?.invoices ?? []);
    this.nudges = clone(seed?.nudges ?? []);
    this.persist = persist;
  }

  async listLeads(): Promise<Lead[]> {
    return newestFirst(this.leads).map(clone);
  }

  async listLeadsNeedingFollowUp(today: string): Promise<Lead[]> {
    return this.leads.filter((lead) => leadNeedsFollowUp(lead, today)).map(clone);
  }

  async listInvoices(): Promise<Invoice[]> {
    return newestFirst(this.invoices).map(clone);
  }

  async listOpenInvoices(): Promise<Invoice[]> {
    return this.invoices.filter(invoiceIsOpen).map(clone);
  }

  async listOverdueInvoices(today: string): Promise<Invoice[]> {
    return this.invoices
      .filter((invoice) => invoiceIsOverdue(invoice, today))
      .map(clone);
  }

  async listNudges(): Promise<Nudge[]> {
    return newestFirst(this.nudges).map(clone);
  }

  async getLead(id: string): Promise<Lead | null> {
    const lead = this.leads.find((row) => row.id === id);
    return lead ? clone(lead) : null;
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    const invoice = this.invoices.find((row) => row.id === id);
    return invoice ? clone(invoice) : null;
  }

  async createLead(input: LeadWrite): Promise<Lead> {
    const lead: Lead = {
      id: nextPrefixedId(
        this.leads.map((row) => row.id),
        "lead",
      ),
      name: input.name,
      email: input.email,
      status: input.status,
      createdAt: todayStamp(),
    };
    applyLeadWrite(lead, input);
    this.leads.push(lead);
    this.flush();
    return clone(lead);
  }

  async updateLead(id: string, input: LeadWrite): Promise<Lead> {
    const lead = this.requireLead(id);
    applyLeadWrite(lead, input);
    this.flush();
    return clone(lead);
  }

  async deleteLead(id: string): Promise<void> {
    this.requireLead(id);
    this.leads = this.leads.filter((row) => row.id !== id);
    this.dropRelatedDrafts(id);
    this.flush();
  }

  async createInvoice(input: InvoiceWrite): Promise<Invoice> {
    const invoice: Invoice = {
      id: nextPrefixedId(
        this.invoices.map((row) => row.id),
        "inv",
      ),
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      invoiceNumber: input.invoiceNumber,
      amountUsd: input.amountUsd,
      status: input.status,
      dueDate: input.dueDate,
      createdAt: todayStamp(),
    };
    applyInvoiceWrite(invoice, input);
    this.invoices.push(invoice);
    this.flush();
    return clone(invoice);
  }

  async updateInvoice(id: string, input: InvoiceWrite): Promise<Invoice> {
    const invoice = this.requireInvoice(id);
    applyInvoiceWrite(invoice, input);
    this.flush();
    return clone(invoice);
  }

  async deleteInvoice(id: string): Promise<void> {
    this.requireInvoice(id);
    this.invoices = this.invoices.filter((row) => row.id !== id);
    this.dropRelatedDrafts(id);
    this.flush();
  }

  async createNudgeDraft(input: {
    kind: NudgeKind;
    relatedId: string;
    draftText: string;
    scheduledFor?: string;
  }): Promise<Nudge> {
    const nudge: Nudge = {
      id: nextPrefixedId(
        this.nudges.map((row) => row.id),
        "nudge",
      ),
      kind: input.kind,
      relatedId: input.relatedId,
      channel: "email",
      draftText: input.draftText,
      status: "draft",
      scheduledFor: input.scheduledFor,
      createdAt: todayStamp(),
    };
    this.nudges.push(nudge);
    this.flush();
    return clone(nudge);
  }

  async updateNudgeDraft(id: string, input: NudgeDraftWrite): Promise<Nudge> {
    const nudge = this.requireNudge(id);
    if (nudge.status !== "draft") {
      throw new Error(`Nudge ${id} is ${nudge.status}, not a draft`);
    }
    applyDraftWrite(nudge, input);
    this.flush();
    return clone(nudge);
  }

  async recordNudgeSendFailure(id: string, error: string): Promise<void> {
    const nudge = this.requireNudge(id);
    if (nudge.status !== "draft") return;
    nudge.lastError = clipError(error);
    nudge.sendAttempts = (nudge.sendAttempts ?? 0) + 1;
    this.flush();
  }

  async markNudgeSent(id: string, sentAt: string): Promise<void> {
    const nudge = this.requireNudge(id);
    nudge.status = "sent";
    nudge.sentAt = sentAt;
    nudge.lastError = undefined;
    nudge.sendAttempts = undefined;
    if (nudge.kind === "invoice") {
      const invoice = this.invoices.find((row) => row.id === nudge.relatedId);
      if (invoice) invoice.lastNudgedAt = sentAt;
    }
    if (nudge.kind === "follow_up") {
      const lead = this.leads.find((row) => row.id === nudge.relatedId);
      if (lead) lead.lastContactAt = sentAt;
    }
    this.flush();
  }

  async markNudgeSkipped(id: string): Promise<void> {
    const nudge = this.requireNudge(id);
    nudge.status = "skipped";
    this.flush();
  }

  private requireLead(id: string): Lead {
    const lead = this.leads.find((row) => row.id === id);
    if (!lead) throw new Error(`No lead with id ${id}`);
    return lead;
  }

  private requireInvoice(id: string): Invoice {
    const invoice = this.invoices.find((row) => row.id === id);
    if (!invoice) throw new Error(`No invoice with id ${id}`);
    return invoice;
  }

  private requireNudge(id: string): Nudge {
    const nudge = this.nudges.find((row) => row.id === id);
    if (!nudge) {
      throw new Error(`No nudge with id ${id}`);
    }
    return nudge;
  }

  private dropRelatedDrafts(relatedId: string) {
    this.nudges = this.nudges.filter(
      (nudge) => !(nudge.relatedId === relatedId && nudge.status === "draft"),
    );
  }

  private flush() {
    this.persist?.({
      leads: clone(this.leads),
      invoices: clone(this.invoices),
      nudges: clone(this.nudges),
    });
  }
}

function applyDraftWrite(nudge: Nudge, input: NudgeDraftWrite) {
  nudge.draftText = input.draftText;
  if (input.scheduledFor !== undefined) {
    const trimmed = input.scheduledFor.trim();
    nudge.scheduledFor = trimmed ? trimmed : undefined;
  }
  nudge.lastError = undefined;
  nudge.sendAttempts = undefined;
}
