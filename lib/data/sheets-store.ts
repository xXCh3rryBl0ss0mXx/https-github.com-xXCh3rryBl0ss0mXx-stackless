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
  fieldsToCells,
  findRowIndex,
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
import { todayStamp } from "../today";
import type {
  DataStore,
  Invoice,
  InvoiceWrite,
  Lead,
  LeadWrite,
  Nudge,
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

  async listLeads(): Promise<Lead[]> {
    return newestFirst(await this.loadLeads());
  }

  async listLeadsNeedingFollowUp(today: string): Promise<Lead[]> {
    return (await this.loadLeads()).filter((lead) => leadNeedsFollowUp(lead, today));
  }

  async listInvoices(): Promise<Invoice[]> {
    return newestFirst(await this.loadInvoices());
  }

  async listOpenInvoices(): Promise<Invoice[]> {
    return (await this.loadInvoices()).filter(invoiceIsOpen);
  }

  async listOverdueInvoices(today: string): Promise<Invoice[]> {
    return (await this.loadInvoices()).filter((invoice) => invoiceIsOverdue(invoice, today));
  }

  async listNudges(): Promise<Nudge[]> {
    return newestFirst(await this.loadNudges());
  }

  async getLead(id: string): Promise<Lead | null> {
    return (await this.loadLeads()).find((lead) => lead.id === id) ?? null;
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    return (await this.loadInvoices()).find((invoice) => invoice.id === id) ?? null;
  }

  async createLead(input: LeadWrite): Promise<Lead> {
    const table = await this.gateway.read(LEAD_TAB);
    const leads = this.leadsFromTable(table);
    const lead: Lead = {
      id: nextPrefixedId(
        leads.map((row) => row.id),
        "lead",
      ),
      name: input.name,
      email: input.email,
      status: input.status,
      createdAt: todayStamp(),
    };
    applyLeadWrite(lead, input);
    await this.gateway.appendRow(LEAD_TAB, fieldsToCells(table.headers, leadToFields(lead)));
    return lead;
  }

  async updateLead(id: string, input: LeadWrite): Promise<Lead> {
    const table = await this.gateway.read(LEAD_TAB);
    const { index, row: existing } = this.requireRow(LEAD_TAB, table, id);
    const lead = leadFromRow(existing);
    applyLeadWrite(lead, input);
    await this.gateway.updateRow(
      LEAD_TAB,
      index,
      fieldsToCells(table.headers, leadToFields(lead), table.rows[index]),
    );
    return lead;
  }

  async deleteLead(id: string): Promise<void> {
    const table = await this.gateway.read(LEAD_TAB);
    const { index } = this.requireRow(LEAD_TAB, table, id);
    await this.gateway.deleteRow(LEAD_TAB, index);
    await this.deleteRelatedDraftNudges(id);
  }

  async createInvoice(input: InvoiceWrite): Promise<Invoice> {
    const table = await this.gateway.read(INVOICE_TAB);
    const invoices = this.invoicesFromTable(table);
    const invoice: Invoice = {
      id: nextPrefixedId(
        invoices.map((row) => row.id),
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
    await this.gateway.appendRow(
      INVOICE_TAB,
      fieldsToCells(table.headers, invoiceToFields(invoice)),
    );
    return invoice;
  }

  async updateInvoice(id: string, input: InvoiceWrite): Promise<Invoice> {
    const table = await this.gateway.read(INVOICE_TAB);
    const { index, row: existing } = this.requireRow(INVOICE_TAB, table, id);
    const invoice = invoiceFromRow(existing);
    applyInvoiceWrite(invoice, input);
    await this.gateway.updateRow(
      INVOICE_TAB,
      index,
      fieldsToCells(table.headers, invoiceToFields(invoice), table.rows[index]),
    );
    return invoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    const table = await this.gateway.read(INVOICE_TAB);
    const { index } = this.requireRow(INVOICE_TAB, table, id);
    await this.gateway.deleteRow(INVOICE_TAB, index);
    await this.deleteRelatedDraftNudges(id);
  }

  async createNudgeDraft(input: {
    kind: NudgeKind;
    relatedId: string;
    draftText: string;
    scheduledFor?: string;
  }): Promise<Nudge> {
    const table = await this.gateway.read(NUDGE_TAB);
    const nudges = this.nudgesFromTable(table);
    const nudge: Nudge = {
      id: nextPrefixedId(
        nudges.map((row) => row.id),
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
    await this.gateway.appendRow(NUDGE_TAB, fieldsToCells(table.headers, nudgeToFields(nudge)));
    return nudge;
  }

  async updateNudgeDraft(id: string, draftText: string): Promise<Nudge> {
    const table = await this.gateway.read(NUDGE_TAB);
    const { index, row } = this.requireRow(NUDGE_TAB, table, id);
    const nudge = nudgeFromRow(row);
    if (nudge.status !== "draft") {
      throw new Error(`Nudge ${id} is ${nudge.status}, not a draft`);
    }
    nudge.draftText = draftText;
    await this.gateway.updateRow(
      NUDGE_TAB,
      index,
      fieldsToCells(table.headers, nudgeToFields(nudge), table.rows[index]),
    );
    return nudge;
  }

  async markNudgeSent(id: string, sentAt: string): Promise<void> {
    const table = await this.gateway.read(NUDGE_TAB);
    const { index, row } = this.requireRow(NUDGE_TAB, table, id);
    const nudge = nudgeFromRow(row);
    nudge.status = "sent";
    nudge.sentAt = sentAt;
    await this.gateway.updateRow(
      NUDGE_TAB,
      index,
      fieldsToCells(table.headers, nudgeToFields(nudge), table.rows[index]),
    );

    if (nudge.kind === "invoice") {
      await this.patchInvoice(nudge.relatedId, { lastNudgedAt: sentAt });
    }
    if (nudge.kind === "follow_up") {
      await this.patchLead(nudge.relatedId, { lastContactAt: sentAt });
    }
  }

  async markNudgeSkipped(id: string): Promise<void> {
    const table = await this.gateway.read(NUDGE_TAB);
    const { index, row } = this.requireRow(NUDGE_TAB, table, id);
    const nudge = nudgeFromRow(row);
    nudge.status = "skipped";
    await this.gateway.updateRow(
      NUDGE_TAB,
      index,
      fieldsToCells(table.headers, nudgeToFields(nudge), table.rows[index]),
    );
  }

  private async loadLeads(): Promise<Lead[]> {
    return this.leadsFromTable(await this.gateway.read(LEAD_TAB));
  }

  private async loadInvoices(): Promise<Invoice[]> {
    return this.invoicesFromTable(await this.gateway.read(INVOICE_TAB));
  }

  private async loadNudges(): Promise<Nudge[]> {
    return this.nudgesFromTable(await this.gateway.read(NUDGE_TAB));
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

  private requireRow(tab: string, table: SheetTable, id: string) {
    const index = findRowIndex(table.headers, table.rows, id);
    if (index < 0) {
      const kind = tab === LEAD_TAB ? "lead" : tab === INVOICE_TAB ? "invoice" : "nudge";
      throw new Error(`No ${kind} with id ${id}`);
    }
    const row = zipRow(table.headers, table.rows[index] ?? []);
    return { index, row };
  }

  private async patchLead(id: string, patch: Partial<Lead>): Promise<void> {
    const table = await this.gateway.read(LEAD_TAB);
    const index = findRowIndex(table.headers, table.rows, id);
    if (index < 0) return;
    const current = leadFromRow(zipRow(table.headers, table.rows[index] ?? []));
    const lead = { ...current, ...patch };
    await this.gateway.updateRow(
      LEAD_TAB,
      index,
      fieldsToCells(table.headers, leadToFields(lead), table.rows[index]),
    );
  }

  private async patchInvoice(id: string, patch: Partial<Invoice>): Promise<void> {
    const table = await this.gateway.read(INVOICE_TAB);
    const index = findRowIndex(table.headers, table.rows, id);
    if (index < 0) return;
    const current = invoiceFromRow(zipRow(table.headers, table.rows[index] ?? []));
    const invoice = { ...current, ...patch };
    await this.gateway.updateRow(
      INVOICE_TAB,
      index,
      fieldsToCells(table.headers, invoiceToFields(invoice), table.rows[index]),
    );
  }

  /** Drop draft nudges for a deleted lead/invoice so Recent nudges can't send to a missing row. */
  private async deleteRelatedDraftNudges(relatedId: string): Promise<void> {
    const table = await this.gateway.read(NUDGE_TAB);
    const indexes: number[] = [];
    for (let i = 0; i < table.rows.length; i += 1) {
      const row = zipRow(table.headers, table.rows[i] ?? []);
      if (!row.id?.trim()) continue;
      if (row.related_id === relatedId && row.status === "draft") {
        indexes.push(i);
      }
    }
    for (const index of indexes.sort((a, b) => b - a)) {
      await this.gateway.deleteRow(NUDGE_TAB, index);
    }
  }
}
