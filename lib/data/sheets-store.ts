import { invoiceIsOpen, invoiceIsOverdue, leadNeedsFollowUp, newestFirst } from "./filters";
import { nextPrefixedId } from "./ids";
import { applyInvoiceWrite, applyLeadWrite } from "./record-input";
import { GoogleSheetsGateway } from "./sheets-gateway";
import {
  MISSING_SHEETS_CREDS,
  readSheetsConfig,
  type SheetsGateway,
} from "./sheets-config";
import {
  assertOwnerColumn,
  fieldsToCells,
  findOwnedRowIndex,
  INVOICE_REQUIRED_COLUMNS,
  INVOICE_TAB,
  invoiceFromRow,
  invoiceToFields,
  LEAD_REQUIRED_COLUMNS,
  LEAD_TAB,
  leadFromRow,
  leadToFields,
  NUDGE_REQUIRED_COLUMNS,
  NUDGE_TAB,
  nudgeFromRow,
  nudgeToFields,
  parseTableRows,
  type SheetTable,
  zipRow,
} from "./sheets-map";
import { isOwnedBy, ownerIdOf, ownedByUser, requireOwnerId } from "./owner";
import { clipError } from "../schedule";
import { todayStamp } from "../today";
import type {
  DataStore,
  Invoice,
  InvoiceWrite,
  Lead,
  LeadWrite,
  Nudge,
  NudgeDraftWrite,
  NudgeKind,
} from "./types";

export { MISSING_SHEETS_CREDS };

export class SheetsDataStore implements DataStore {
  private readonly gateway: SheetsGateway;

  constructor(options?: { gateway?: SheetsGateway; env?: NodeJS.Dict<string> }) {
    if (options?.gateway) {
      this.gateway = options.gateway;
      return;
    }
    const parsed = readSheetsConfig(options?.env ?? process.env);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    this.gateway = new GoogleSheetsGateway(parsed.config);
  }

  async listLeads(userId: string): Promise<Lead[]> {
    return newestFirst(await this.loadLeads(userId));
  }

  async listLeadsNeedingFollowUp(userId: string, today: string): Promise<Lead[]> {
    return (await this.loadLeads(userId)).filter((lead) => leadNeedsFollowUp(lead, today));
  }

  async listInvoices(userId: string): Promise<Invoice[]> {
    return newestFirst(await this.loadInvoices(userId));
  }

  async listOpenInvoices(userId: string): Promise<Invoice[]> {
    return (await this.loadInvoices(userId)).filter(invoiceIsOpen);
  }

  async listOverdueInvoices(userId: string, today: string): Promise<Invoice[]> {
    return (await this.loadInvoices(userId)).filter((invoice) => invoiceIsOverdue(invoice, today));
  }

  async listNudges(userId: string): Promise<Nudge[]> {
    return newestFirst(await this.loadNudges(userId));
  }

  async getLead(userId: string, id: string): Promise<Lead | null> {
    return (await this.loadLeads(userId)).find((lead) => lead.id === id) ?? null;
  }

  async getInvoice(userId: string, id: string): Promise<Invoice | null> {
    return (await this.loadInvoices(userId)).find((invoice) => invoice.id === id) ?? null;
  }

  async createLead(userId: string, input: LeadWrite): Promise<Lead> {
    const owner = requireOwnerId(userId);
    const table = await this.gateway.read(LEAD_TAB);
    assertOwnerColumn(LEAD_TAB, table.headers);
    const leads = this.leadsFromTable(table);
    const lead: Lead = {
      id: nextPrefixedId(
        leads.map((row) => row.id),
        "lead",
      ),
      userId: owner,
      name: input.name,
      email: input.email,
      status: input.status,
      createdAt: todayStamp(),
    };
    applyLeadWrite(lead, input);
    await this.gateway.appendRow(LEAD_TAB, fieldsToCells(table.headers, leadToFields(lead)));
    return lead;
  }

  async updateLead(userId: string, id: string, input: LeadWrite): Promise<Lead> {
    const table = await this.gateway.read(LEAD_TAB);
    const { index, row: existing } = this.requireOwnedRow(LEAD_TAB, table, id, userId);
    const lead = leadFromRow(existing);
    applyLeadWrite(lead, input);
    await this.gateway.updateRow(
      LEAD_TAB,
      index,
      fieldsToCells(table.headers, leadToFields(lead), table.rows[index]),
    );
    return lead;
  }

  async deleteLead(userId: string, id: string): Promise<void> {
    const table = await this.gateway.read(LEAD_TAB);
    const { index } = this.requireOwnedRow(LEAD_TAB, table, id, userId);
    await this.gateway.deleteRow(LEAD_TAB, index);
    await this.deleteRelatedDraftNudges(id, userId);
  }

  async createInvoice(userId: string, input: InvoiceWrite): Promise<Invoice> {
    const owner = requireOwnerId(userId);
    const table = await this.gateway.read(INVOICE_TAB);
    assertOwnerColumn(INVOICE_TAB, table.headers);
    const invoices = this.invoicesFromTable(table);
    const invoice: Invoice = {
      id: nextPrefixedId(
        invoices.map((row) => row.id),
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
    await this.gateway.appendRow(
      INVOICE_TAB,
      fieldsToCells(table.headers, invoiceToFields(invoice)),
    );
    return invoice;
  }

  async updateInvoice(userId: string, id: string, input: InvoiceWrite): Promise<Invoice> {
    const table = await this.gateway.read(INVOICE_TAB);
    const { index, row: existing } = this.requireOwnedRow(INVOICE_TAB, table, id, userId);
    const invoice = invoiceFromRow(existing);
    applyInvoiceWrite(invoice, input);
    await this.gateway.updateRow(
      INVOICE_TAB,
      index,
      fieldsToCells(table.headers, invoiceToFields(invoice), table.rows[index]),
    );
    return invoice;
  }

  async deleteInvoice(userId: string, id: string): Promise<void> {
    const table = await this.gateway.read(INVOICE_TAB);
    const { index } = this.requireOwnedRow(INVOICE_TAB, table, id, userId);
    await this.gateway.deleteRow(INVOICE_TAB, index);
    await this.deleteRelatedDraftNudges(id, userId);
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
    const table = await this.gateway.read(NUDGE_TAB);
    assertOwnerColumn(NUDGE_TAB, table.headers);
    const nudges = this.nudgesFromTable(table);
    const nudge: Nudge = {
      id: nextPrefixedId(
        nudges.map((row) => row.id),
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
    await this.gateway.appendRow(NUDGE_TAB, fieldsToCells(table.headers, nudgeToFields(nudge)));
    return nudge;
  }

  async updateNudgeDraft(userId: string, id: string, input: NudgeDraftWrite): Promise<Nudge> {
    const table = await this.gateway.read(NUDGE_TAB);
    const { index, row } = this.requireOwnedRow(NUDGE_TAB, table, id, userId);
    const nudge = nudgeFromRow(row);
    if (nudge.status !== "draft") {
      throw new Error(`Nudge ${id} is ${nudge.status}, not a draft`);
    }
    applyDraftWrite(nudge, input);
    await this.gateway.updateRow(
      NUDGE_TAB,
      index,
      fieldsToCells(table.headers, nudgeToFields(nudge), table.rows[index]),
    );
    return nudge;
  }

  async recordNudgeSendFailure(userId: string, id: string, error: string): Promise<void> {
    const table = await this.gateway.read(NUDGE_TAB);
    const { index, row } = this.requireOwnedRow(NUDGE_TAB, table, id, userId);
    const nudge = nudgeFromRow(row);
    if (nudge.status !== "draft") return;
    nudge.lastError = clipError(error);
    nudge.sendAttempts = (nudge.sendAttempts ?? 0) + 1;
    await this.gateway.updateRow(
      NUDGE_TAB,
      index,
      fieldsToCells(table.headers, nudgeToFields(nudge), table.rows[index]),
    );
  }

  async markNudgeSent(userId: string, id: string, sentAt: string): Promise<void> {
    const owner = requireOwnerId(userId);
    const table = await this.gateway.read(NUDGE_TAB);
    const { index, row } = this.requireOwnedRow(NUDGE_TAB, table, id, owner);
    const nudge = nudgeFromRow(row);
    nudge.status = "sent";
    nudge.sentAt = sentAt;
    nudge.lastError = undefined;
    nudge.sendAttempts = undefined;
    await this.gateway.updateRow(
      NUDGE_TAB,
      index,
      fieldsToCells(table.headers, nudgeToFields(nudge), table.rows[index]),
    );

    if (nudge.kind === "invoice") {
      await this.patchInvoice(owner, nudge.relatedId, { lastNudgedAt: sentAt });
    }
    if (nudge.kind === "follow_up") {
      await this.patchLead(owner, nudge.relatedId, { lastContactAt: sentAt });
    }
  }

  async markNudgeSkipped(userId: string, id: string): Promise<void> {
    const table = await this.gateway.read(NUDGE_TAB);
    const { index, row } = this.requireOwnedRow(NUDGE_TAB, table, id, userId);
    const nudge = nudgeFromRow(row);
    nudge.status = "skipped";
    await this.gateway.updateRow(
      NUDGE_TAB,
      index,
      fieldsToCells(table.headers, nudgeToFields(nudge), table.rows[index]),
    );
  }

  async listNudgeOwnerIds(): Promise<string[]> {
    const nudges = this.nudgesFromTable(await this.gateway.read(NUDGE_TAB));
    const ids = new Set<string>();
    for (const nudge of nudges) {
      const owner = ownerIdOf(nudge.userId);
      if (owner) ids.add(owner);
    }
    return [...ids];
  }

  private async loadLeads(userId: string): Promise<Lead[]> {
    return ownedByUser(this.leadsFromTable(await this.gateway.read(LEAD_TAB)), userId);
  }

  private async loadInvoices(userId: string): Promise<Invoice[]> {
    return ownedByUser(this.invoicesFromTable(await this.gateway.read(INVOICE_TAB)), userId);
  }

  private async loadNudges(userId: string): Promise<Nudge[]> {
    return ownedByUser(this.nudgesFromTable(await this.gateway.read(NUDGE_TAB)), userId);
  }

  private leadsFromTable(table: SheetTable): Lead[] {
    return parseTableRows(LEAD_TAB, table, LEAD_REQUIRED_COLUMNS, leadFromRow);
  }

  private invoicesFromTable(table: SheetTable): Invoice[] {
    return parseTableRows(INVOICE_TAB, table, INVOICE_REQUIRED_COLUMNS, invoiceFromRow);
  }

  private nudgesFromTable(table: SheetTable): Nudge[] {
    return parseTableRows(NUDGE_TAB, table, NUDGE_REQUIRED_COLUMNS, nudgeFromRow);
  }

  private requireOwnedRow(tab: string, table: SheetTable, id: string, userId: string) {
    const owner = requireOwnerId(userId);
    const index = findOwnedRowIndex(table.headers, table.rows, id, owner);
    if (index < 0) {
      const kind = tab === LEAD_TAB ? "lead" : tab === INVOICE_TAB ? "invoice" : "nudge";
      throw new Error(`No ${kind} with id ${id}`);
    }
    const row = zipRow(table.headers, table.rows[index] ?? []);
    if (!isOwnedBy(owner, ownerIdOf(row.user_id))) {
      const kind = tab === LEAD_TAB ? "lead" : tab === INVOICE_TAB ? "invoice" : "nudge";
      throw new Error(`No ${kind} with id ${id}`);
    }
    return { index, row };
  }

  private async requireRelatedRecord(
    userId: string,
    kind: NudgeKind,
    relatedId: string,
  ): Promise<void> {
    if (kind === "follow_up") {
      const lead = await this.getLead(userId, relatedId);
      if (!lead) throw new Error(`No lead with id ${relatedId}`);
      return;
    }
    const invoice = await this.getInvoice(userId, relatedId);
    if (!invoice) throw new Error(`No invoice with id ${relatedId}`);
  }

  private async patchLead(userId: string, id: string, patch: Partial<Lead>): Promise<void> {
    const table = await this.gateway.read(LEAD_TAB);
    const index = findOwnedRowIndex(table.headers, table.rows, id, requireOwnerId(userId));
    if (index < 0) return;
    const current = leadFromRow(zipRow(table.headers, table.rows[index] ?? []));
    if (!isOwnedBy(userId, current.userId)) return;
    const lead = { ...current, ...patch };
    await this.gateway.updateRow(
      LEAD_TAB,
      index,
      fieldsToCells(table.headers, leadToFields(lead), table.rows[index]),
    );
  }

  private async patchInvoice(userId: string, id: string, patch: Partial<Invoice>): Promise<void> {
    const table = await this.gateway.read(INVOICE_TAB);
    const index = findOwnedRowIndex(table.headers, table.rows, id, requireOwnerId(userId));
    if (index < 0) return;
    const current = invoiceFromRow(zipRow(table.headers, table.rows[index] ?? []));
    if (!isOwnedBy(userId, current.userId)) return;
    const invoice = { ...current, ...patch };
    await this.gateway.updateRow(
      INVOICE_TAB,
      index,
      fieldsToCells(table.headers, invoiceToFields(invoice), table.rows[index]),
    );
  }

  /** Drop draft nudges for a deleted lead/invoice so Recent nudges can't send to a missing row. */
  private async deleteRelatedDraftNudges(relatedId: string, userId: string): Promise<void> {
    const owner = requireOwnerId(userId);
    const table = await this.gateway.read(NUDGE_TAB);
    const indexes: number[] = [];
    for (let i = 0; i < table.rows.length; i += 1) {
      const row = zipRow(table.headers, table.rows[i] ?? []);
      if (!row.id?.trim()) continue;
      if (
        row.related_id === relatedId &&
        row.status === "draft" &&
        isOwnedBy(owner, ownerIdOf(row.user_id))
      ) {
        indexes.push(i);
      }
    }
    for (const index of indexes.sort((a, b) => b - a)) {
      await this.gateway.deleteRow(NUDGE_TAB, index);
    }
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
