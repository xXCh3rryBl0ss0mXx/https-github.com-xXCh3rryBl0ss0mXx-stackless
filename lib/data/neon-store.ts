import { clipError } from "../schedule";
import { todayStamp } from "../today";
import { invoiceIsOpen, invoiceIsOverdue, leadNeedsFollowUp, newestFirst } from "./filters";
import { nextPrefixedId } from "./ids";
import { MISSING_NEON_URL, readNeonConfig } from "./neon-config";
import {
  dbValues,
  INVOICE_DB_COLUMNS,
  invoiceFromDb,
  invoiceToDb,
  LEAD_DB_COLUMNS,
  leadFromDb,
  leadToDb,
  NUDGE_DB_COLUMNS,
  nudgeFromDb,
  nudgeToDb,
  sqlPlaceholders,
} from "./neon-map";
import { SCHEMA_STATEMENTS } from "./neon-schema";
import { createNeonSqlClient, type SqlClient } from "./neon-sql";
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
} from "./types";

export { MISSING_NEON_URL };

function sqlSet(columns: readonly string[], startAt = 1): string {
  return columns.map((column, index) => `${column} = $${startAt + index}`).join(", ");
}

export class NeonDataStore implements DataStore {
  private readonly client: SqlClient;
  private schemaReady: Promise<void> | undefined;

  constructor(options?: { client?: SqlClient; env?: NodeJS.Dict<string> }) {
    if (options?.client) {
      this.client = options.client;
      return;
    }
    const parsed = readNeonConfig(options?.env ?? process.env);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    this.client = createNeonSqlClient(parsed.databaseUrl);
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
    const row = await this.fetchById("leads", id);
    return row ? leadFromDb(row) : null;
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    const row = await this.fetchById("invoices", id);
    return row ? invoiceFromDb(row) : null;
  }

  async createLead(input: LeadWrite): Promise<Lead> {
    const lead: Lead = {
      id: nextPrefixedId(await this.listIds("leads"), "lead"),
      name: input.name,
      email: input.email,
      status: input.status,
      createdAt: todayStamp(),
    };
    applyLeadWrite(lead, input);
    await this.insert("leads", LEAD_DB_COLUMNS, leadToDb(lead));
    return lead;
  }

  async updateLead(id: string, input: LeadWrite): Promise<Lead> {
    const lead = leadFromDb(await this.requireRow("leads", id, "lead"));
    applyLeadWrite(lead, input);
    await this.updateById("leads", LEAD_DB_COLUMNS, leadToDb(lead), id);
    return lead;
  }

  async deleteLead(id: string): Promise<void> {
    await this.requireRow("leads", id, "lead");
    await this.deleteRelatedDraftNudges(id);
    await this.query("DELETE FROM leads WHERE id = $1", [id]);
  }

  async createInvoice(input: InvoiceWrite): Promise<Invoice> {
    const invoice: Invoice = {
      id: nextPrefixedId(await this.listIds("invoices"), "inv"),
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      invoiceNumber: input.invoiceNumber,
      amountUsd: input.amountUsd,
      status: input.status,
      dueDate: input.dueDate,
      createdAt: todayStamp(),
    };
    applyInvoiceWrite(invoice, input);
    await this.insert("invoices", INVOICE_DB_COLUMNS, invoiceToDb(invoice));
    return invoice;
  }

  async updateInvoice(id: string, input: InvoiceWrite): Promise<Invoice> {
    const invoice = invoiceFromDb(await this.requireRow("invoices", id, "invoice"));
    applyInvoiceWrite(invoice, input);
    await this.updateById("invoices", INVOICE_DB_COLUMNS, invoiceToDb(invoice), id);
    return invoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.requireRow("invoices", id, "invoice");
    await this.deleteRelatedDraftNudges(id);
    await this.query("DELETE FROM invoices WHERE id = $1", [id]);
  }

  async createNudgeDraft(input: {
    kind: NudgeKind;
    relatedId: string;
    draftText: string;
    scheduledFor?: string;
  }): Promise<Nudge> {
    const nudge: Nudge = {
      id: nextPrefixedId(await this.listIds("nudge_log"), "nudge"),
      kind: input.kind,
      relatedId: input.relatedId,
      channel: "email",
      draftText: input.draftText,
      status: "draft",
      scheduledFor: input.scheduledFor,
      createdAt: todayStamp(),
    };
    await this.insert("nudge_log", NUDGE_DB_COLUMNS, nudgeToDb(nudge));
    return nudge;
  }

  async updateNudgeDraft(id: string, input: NudgeDraftWrite): Promise<Nudge> {
    const nudge = nudgeFromDb(await this.requireRow("nudge_log", id, "nudge"));
    if (nudge.status !== "draft") {
      throw new Error(`Nudge ${id} is ${nudge.status}, not a draft`);
    }
    applyDraftWrite(nudge, input);
    await this.updateById("nudge_log", NUDGE_DB_COLUMNS, nudgeToDb(nudge), id);
    return nudge;
  }

  async recordNudgeSendFailure(id: string, error: string): Promise<void> {
    const nudge = nudgeFromDb(await this.requireRow("nudge_log", id, "nudge"));
    if (nudge.status !== "draft") return;
    nudge.lastError = clipError(error);
    nudge.sendAttempts = (nudge.sendAttempts ?? 0) + 1;
    await this.updateById("nudge_log", NUDGE_DB_COLUMNS, nudgeToDb(nudge), id);
  }

  async markNudgeSent(id: string, sentAt: string): Promise<void> {
    const nudge = nudgeFromDb(await this.requireRow("nudge_log", id, "nudge"));
    nudge.status = "sent";
    nudge.sentAt = sentAt;
    nudge.lastError = undefined;
    nudge.sendAttempts = undefined;
    await this.updateById("nudge_log", NUDGE_DB_COLUMNS, nudgeToDb(nudge), id);

    if (nudge.kind === "invoice") {
      await this.patchInvoice(nudge.relatedId, { lastNudgedAt: sentAt });
    }
    if (nudge.kind === "follow_up") {
      await this.patchLead(nudge.relatedId, { lastContactAt: sentAt });
    }
  }

  async markNudgeSkipped(id: string): Promise<void> {
    const nudge = nudgeFromDb(await this.requireRow("nudge_log", id, "nudge"));
    nudge.status = "skipped";
    await this.updateById("nudge_log", NUDGE_DB_COLUMNS, nudgeToDb(nudge), id);
  }

  private async loadLeads(): Promise<Lead[]> {
    const { rows } = await this.query("SELECT * FROM leads");
    return rows.map(leadFromDb);
  }

  private async loadInvoices(): Promise<Invoice[]> {
    const { rows } = await this.query("SELECT * FROM invoices");
    return rows.map(invoiceFromDb);
  }

  private async loadNudges(): Promise<Nudge[]> {
    const { rows } = await this.query("SELECT * FROM nudge_log");
    return rows.map(nudgeFromDb);
  }

  private async listIds(table: "leads" | "invoices" | "nudge_log"): Promise<string[]> {
    const { rows } = await this.query<{ id: unknown }>(`SELECT id FROM ${table}`);
    return rows.map((row) => String(row.id));
  }

  private async fetchById(
    table: "leads" | "invoices" | "nudge_log",
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const { rows } = await this.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  private async requireRow(
    table: "leads" | "invoices" | "nudge_log",
    id: string,
    kind: "lead" | "invoice" | "nudge",
  ): Promise<Record<string, unknown>> {
    const row = await this.fetchById(table, id);
    if (!row) throw new Error(`No ${kind} with id ${id}`);
    return row;
  }

  private async insert(
    table: string,
    columns: readonly string[],
    row: Record<string, unknown>,
  ): Promise<void> {
    await this.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${sqlPlaceholders(columns.length)})`,
      dbValues(row, columns),
    );
  }

  private async updateById(
    table: string,
    columns: readonly string[],
    row: Record<string, unknown>,
    id: string,
  ): Promise<void> {
    const writable = columns.filter((column) => column !== "id");
    await this.query(
      `UPDATE ${table} SET ${sqlSet(writable)} WHERE id = $${writable.length + 1}`,
      [...dbValues(row, writable), id],
    );
  }

  private async patchLead(id: string, patch: Partial<Lead>): Promise<void> {
    const row = await this.fetchById("leads", id);
    if (!row) return;
    const lead = { ...leadFromDb(row), ...patch };
    await this.updateById("leads", LEAD_DB_COLUMNS, leadToDb(lead), id);
  }

  private async patchInvoice(id: string, patch: Partial<Invoice>): Promise<void> {
    const row = await this.fetchById("invoices", id);
    if (!row) return;
    const invoice = { ...invoiceFromDb(row), ...patch };
    await this.updateById("invoices", INVOICE_DB_COLUMNS, invoiceToDb(invoice), id);
  }

  private async deleteRelatedDraftNudges(relatedId: string): Promise<void> {
    await this.query("DELETE FROM nudge_log WHERE related_id = $1 AND status = 'draft'", [
      relatedId,
    ]);
  }

  private async query<T = Record<string, unknown>>(text: string, params?: unknown[]) {
    await this.ensureSchema();
    return this.client.query<T>(text, params);
  }

  private async ensureSchema(): Promise<void> {
    this.schemaReady ??= this.applySchema().catch((error: unknown) => {
      this.schemaReady = undefined;
      throw error;
    });
    await this.schemaReady;
  }

  private async applySchema(): Promise<void> {
    for (const statement of SCHEMA_STATEMENTS) {
      await this.client.query(statement);
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
