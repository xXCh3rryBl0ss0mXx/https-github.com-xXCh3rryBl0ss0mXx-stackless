import { clipError } from "../schedule";
import { todayStamp } from "../today";
import { invoiceIsOpen, invoiceIsOverdue, leadNeedsFollowUp, newestFirst } from "./filters";
import { nextPrefixedId } from "./ids";
import { isOwnedBy, ownerIdOf, ownedByUser, requireOwnerId } from "./owner";
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

  async listLeads(userId: string): Promise<Lead[]> {
    return newestFirst(ownedByUser(this.leads, userId)).map(clone);
  }

  async listLeadsNeedingFollowUp(userId: string, today: string): Promise<Lead[]> {
    return ownedByUser(this.leads, userId)
      .filter((lead) => leadNeedsFollowUp(lead, today))
      .map(clone);
  }

  async listInvoices(userId: string): Promise<Invoice[]> {
    return newestFirst(ownedByUser(this.invoices, userId)).map(clone);
  }

  async listOpenInvoices(userId: string): Promise<Invoice[]> {
    return ownedByUser(this.invoices, userId).filter(invoiceIsOpen).map(clone);
  }

  async listOverdueInvoices(userId: string, today: string): Promise<Invoice[]> {
    return ownedByUser(this.invoices, userId)
      .filter((invoice) => invoiceIsOverdue(invoice, today))
      .map(clone);
  }

  async listNudges(userId: string): Promise<Nudge[]> {
    return newestFirst(ownedByUser(this.nudges, userId)).map(clone);
  }

  async getLead(userId: string, id: string): Promise<Lead | null> {
    const lead = this.findLead(userId, id);
    return lead ? clone(lead) : null;
  }

  async getInvoice(userId: string, id: string): Promise<Invoice | null> {
    const invoice = this.findInvoice(userId, id);
    return invoice ? clone(invoice) : null;
  }

  async createLead(userId: string, input: LeadWrite): Promise<Lead> {
    const owner = requireOwnerId(userId);
    const lead: Lead = {
      id: nextPrefixedId(
        this.leads.map((row) => row.id),
        "lead",
      ),
      userId: owner,
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

  async updateLead(userId: string, id: string, input: LeadWrite): Promise<Lead> {
    const lead = this.requireLead(userId, id);
    applyLeadWrite(lead, input);
    this.flush();
    return clone(lead);
  }

  async deleteLead(userId: string, id: string): Promise<void> {
    this.requireLead(userId, id);
    this.leads = this.leads.filter((row) => row.id !== id);
    this.dropRelatedDrafts(userId, id);
    this.flush();
  }

  async createInvoice(userId: string, input: InvoiceWrite): Promise<Invoice> {
    const owner = requireOwnerId(userId);
    const invoice: Invoice = {
      id: nextPrefixedId(
        this.invoices.map((row) => row.id),
        "inv",
      ),
      userId: owner,
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

  async updateInvoice(userId: string, id: string, input: InvoiceWrite): Promise<Invoice> {
    const invoice = this.requireInvoice(userId, id);
    applyInvoiceWrite(invoice, input);
    this.flush();
    return clone(invoice);
  }

  async deleteInvoice(userId: string, id: string): Promise<void> {
    this.requireInvoice(userId, id);
    this.invoices = this.invoices.filter((row) => row.id !== id);
    this.dropRelatedDrafts(userId, id);
    this.flush();
  }

  async createNudgeDraft(
    userId: string,
    input: {
      kind: NudgeKind;
      relatedId: string;
      draftText: string;
      scheduledFor?: string;
    },
  ): Promise<Nudge> {
    const owner = requireOwnerId(userId);
    await this.requireRelatedRecord(owner, input.kind, input.relatedId);
    const nudge: Nudge = {
      id: nextPrefixedId(
        this.nudges.map((row) => row.id),
        "nudge",
      ),
      userId: owner,
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

  async updateNudgeDraft(userId: string, id: string, input: NudgeDraftWrite): Promise<Nudge> {
    const nudge = this.requireNudge(userId, id);
    if (nudge.status !== "draft") {
      throw new Error(`Nudge ${id} is ${nudge.status}, not a draft`);
    }
    applyDraftWrite(nudge, input);
    this.flush();
    return clone(nudge);
  }

  async recordNudgeSendFailure(userId: string, id: string, error: string): Promise<void> {
    const nudge = this.requireNudge(userId, id);
    if (nudge.status !== "draft") return;
    nudge.lastError = clipError(error);
    nudge.sendAttempts = (nudge.sendAttempts ?? 0) + 1;
    this.flush();
  }

  async markNudgeSent(userId: string, id: string, sentAt: string): Promise<void> {
    const owner = requireOwnerId(userId);
    const nudge = this.requireNudge(owner, id);
    nudge.status = "sent";
    nudge.sentAt = sentAt;
    nudge.lastError = undefined;
    nudge.sendAttempts = undefined;
    if (nudge.kind === "invoice") {
      const invoice = this.findInvoice(owner, nudge.relatedId);
      if (invoice) invoice.lastNudgedAt = sentAt;
    }
    if (nudge.kind === "follow_up") {
      const lead = this.findLead(owner, nudge.relatedId);
      if (lead) lead.lastContactAt = sentAt;
    }
    this.flush();
  }

  async markNudgeSkipped(userId: string, id: string): Promise<void> {
    const nudge = this.requireNudge(userId, id);
    nudge.status = "skipped";
    this.flush();
  }

  async listNudgeOwnerIds(): Promise<string[]> {
    const ids = new Set<string>();
    for (const nudge of this.nudges) {
      const owner = ownerIdOf(nudge.userId);
      if (owner) ids.add(owner);
    }
    return [...ids];
  }

  private findLead(userId: string, id: string): Lead | undefined {
    const owner = requireOwnerId(userId);
    return this.leads.find((row) => row.id === id && isOwnedBy(owner, row.userId));
  }

  private findInvoice(userId: string, id: string): Invoice | undefined {
    const owner = requireOwnerId(userId);
    return this.invoices.find((row) => row.id === id && isOwnedBy(owner, row.userId));
  }

  private requireLead(userId: string, id: string): Lead {
    const lead = this.findLead(userId, id);
    if (!lead) throw new Error(`No lead with id ${id}`);
    return lead;
  }

  private requireInvoice(userId: string, id: string): Invoice {
    const invoice = this.findInvoice(userId, id);
    if (!invoice) throw new Error(`No invoice with id ${id}`);
    return invoice;
  }

  private requireNudge(userId: string, id: string): Nudge {
    const owner = requireOwnerId(userId);
    const nudge = this.nudges.find((row) => row.id === id && isOwnedBy(owner, row.userId));
    if (!nudge) {
      throw new Error(`No nudge with id ${id}`);
    }
    return nudge;
  }

  private async requireRelatedRecord(
    userId: string,
    kind: NudgeKind,
    relatedId: string,
  ): Promise<void> {
    if (kind === "follow_up") {
      this.requireLead(userId, relatedId);
      return;
    }
    this.requireInvoice(userId, relatedId);
  }

  private dropRelatedDrafts(userId: string, relatedId: string) {
    const owner = requireOwnerId(userId);
    this.nudges = this.nudges.filter(
      (nudge) =>
        !(
          nudge.relatedId === relatedId &&
          nudge.status === "draft" &&
          isOwnedBy(owner, nudge.userId)
        ),
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
