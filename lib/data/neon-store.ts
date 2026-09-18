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
  WAITLIST_DB_COLUMNS,
  waitlistFromDb,
  waitlistToDb,
} from "./neon-map";
import { SCHEMA_STATEMENTS } from "./neon-schema";
import { createNeonSqlClient, type SqlClient } from "./neon-sql";
import { isOwnedBy, ownerIdOf, requireOwnerId } from "./owner";
import { applyInvoiceWrite, applyLeadWrite } from "./record-input";
import { parseWaitlistEmail } from "./waitlist";
import type {
  DataStore,
  Invoice,
  InvoiceWrite,
  Lead,
  LeadWrite,
  Nudge,
  NudgeDraftWrite,
  NudgeKind,
  WaitlistSignupWriteResult,
} from "./types";

export { MISSING_NEON_URL };

function sqlSet(columns: readonly string[], startAt = 1): string {
  return columns.map((column, index) => `${column} = $${startAt + index}`).join(", ");
}

function writableColumns(columns: readonly string[]): string[] {
  return columns.filter((column) => column !== "id" && column !== "user_id");
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
    const row = await this.fetchById("leads", id, userId);
    return row ? leadFromDb(row) : null;
  }

  async getInvoice(userId: string, id: string): Promise<Invoice | null> {
    const row = await this.fetchById("invoices", id, userId);
    return row ? invoiceFromDb(row) : null;
  }

  async createLead(userId: string, input: LeadWrite): Promise<Lead> {
    const owner = requireOwnerId(userId);
    const lead: Lead = {
      id: nextPrefixedId(await this.listIds("leads"), "lead"),
      userId: owner,
      name: input.name,
      email: input.email,
      status: input.status,
      createdAt: todayStamp(),
    };
    applyLeadWrite(lead, input);
    await this.insert("leads", LEAD_DB_COLUMNS, leadToDb(lead));
    return lead;
  }

  async updateLead(userId: string, id: string, input: LeadWrite): Promise<Lead> {
    const lead = leadFromDb(await this.requireRow("leads", id, "lead", userId));
    applyLeadWrite(lead, input);
    await this.updateOwned("leads", LEAD_DB_COLUMNS, leadToDb(lead), id, userId);
    return lead;
  }

  async deleteLead(userId: string, id: string): Promise<void> {
    await this.requireRow("leads", id, "lead", userId);
    await this.deleteRelatedDraftNudges(id, userId);
    await this.query("DELETE FROM leads WHERE id = $1 AND user_id = $2", [
      id,
      requireOwnerId(userId),
    ]);
  }

  async createInvoice(userId: string, input: InvoiceWrite): Promise<Invoice> {
    const owner = requireOwnerId(userId);
    const invoice: Invoice = {
      id: nextPrefixedId(await this.listIds("invoices"), "inv"),
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
    await this.insert("invoices", INVOICE_DB_COLUMNS, invoiceToDb(invoice));
    return invoice;
  }

  async updateInvoice(userId: string, id: string, input: InvoiceWrite): Promise<Invoice> {
    const invoice = invoiceFromDb(await this.requireRow("invoices", id, "invoice", userId));
    applyInvoiceWrite(invoice, input);
    await this.updateOwned("invoices", INVOICE_DB_COLUMNS, invoiceToDb(invoice), id, userId);
    return invoice;
  }

  async deleteInvoice(userId: string, id: string): Promise<void> {
    await this.requireRow("invoices", id, "invoice", userId);
    await this.deleteRelatedDraftNudges(id, userId);
    await this.query("DELETE FROM invoices WHERE id = $1 AND user_id = $2", [
      id,
      requireOwnerId(userId),
    ]);
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
      id: nextPrefixedId(await this.listIds("nudge_log"), "nudge"),
      userId: owner,
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

  async updateNudgeDraft(userId: string, id: string, input: NudgeDraftWrite): Promise<Nudge> {
    const nudge = nudgeFromDb(await this.requireRow("nudge_log", id, "nudge", userId));
    if (nudge.status !== "draft") {
      throw new Error(`Nudge ${id} is ${nudge.status}, not a draft`);
    }
    applyDraftWrite(nudge, input);
    await this.updateOwned("nudge_log", NUDGE_DB_COLUMNS, nudgeToDb(nudge), id, userId);
    return nudge;
  }

  async recordNudgeSendFailure(userId: string, id: string, error: string): Promise<void> {
    const nudge = nudgeFromDb(await this.requireRow("nudge_log", id, "nudge", userId));
    if (nudge.status !== "draft") return;
    nudge.lastError = clipError(error);
    nudge.sendAttempts = (nudge.sendAttempts ?? 0) + 1;
    await this.updateOwned("nudge_log", NUDGE_DB_COLUMNS, nudgeToDb(nudge), id, userId);
  }

  async markNudgeSent(userId: string, id: string, sentAt: string): Promise<void> {
    const owner = requireOwnerId(userId);
    const nudge = nudgeFromDb(await this.requireRow("nudge_log", id, "nudge", owner));
    nudge.status = "sent";
    nudge.sentAt = sentAt;
    nudge.lastError = undefined;
    nudge.sendAttempts = undefined;
    await this.updateOwned("nudge_log", NUDGE_DB_COLUMNS, nudgeToDb(nudge), id, owner);

    if (nudge.kind === "invoice") {
      await this.patchInvoice(owner, nudge.relatedId, { lastNudgedAt: sentAt });
    }
    if (nudge.kind === "follow_up") {
      await this.patchLead(owner, nudge.relatedId, { lastContactAt: sentAt });
    }
  }

  async markNudgeSkipped(userId: string, id: string): Promise<void> {
    const nudge = nudgeFromDb(await this.requireRow("nudge_log", id, "nudge", userId));
    nudge.status = "skipped";
    await this.updateOwned("nudge_log", NUDGE_DB_COLUMNS, nudgeToDb(nudge), id, userId);
  }

  async listNudgeOwnerIds(): Promise<string[]> {
    const { rows } = await this.query<{ user_id: unknown }>("SELECT user_id FROM nudge_log");
    const ids = new Set<string>();
    for (const row of rows) {
      const owner = ownerIdOf(asText(row.user_id));
      if (owner) ids.add(owner);
    }
    return [...ids];
  }

  async addWaitlistSignup(email: string): Promise<WaitlistSignupWriteResult> {
    const normalized = parseWaitlistEmail(email);
    const signup = {
      id: `waitlist_${crypto.randomUUID()}`,
      email: normalized,
      createdAt: todayStamp(),
    };
    const inserted = await this.query(
      `INSERT INTO waitlist_signups (${WAITLIST_DB_COLUMNS.join(", ")}) VALUES (${sqlPlaceholders(WAITLIST_DB_COLUMNS.length)}) ON CONFLICT (email) DO NOTHING RETURNING ${WAITLIST_DB_COLUMNS.join(", ")}`,
      dbValues(waitlistToDb(signup), WAITLIST_DB_COLUMNS),
    );
    if (inserted.rows[0]) {
      return { created: true, signup: waitlistFromDb(inserted.rows[0]) };
    }
    const existing = await this.query("SELECT * FROM waitlist_signups WHERE email = $1", [
      normalized,
    ]);
    const row = existing.rows[0];
    if (!row) {
      throw new Error("Couldn’t save that email. Try again.");
    }
    return { created: false, signup: waitlistFromDb(row) };
  }

  private async loadLeads(userId: string): Promise<Lead[]> {
    const owner = requireOwnerId(userId);
    const { rows } = await this.query("SELECT * FROM leads WHERE user_id = $1", [owner]);
    return rows.map(leadFromDb).filter((lead) => isOwnedBy(owner, lead.userId));
  }

  private async loadInvoices(userId: string): Promise<Invoice[]> {
    const owner = requireOwnerId(userId);
    const { rows } = await this.query("SELECT * FROM invoices WHERE user_id = $1", [owner]);
    return rows.map(invoiceFromDb).filter((invoice) => isOwnedBy(owner, invoice.userId));
  }

  private async loadNudges(userId: string): Promise<Nudge[]> {
    const owner = requireOwnerId(userId);
    const { rows } = await this.query("SELECT * FROM nudge_log WHERE user_id = $1", [owner]);
    return rows.map(nudgeFromDb).filter((nudge) => isOwnedBy(owner, nudge.userId));
  }

  private async listIds(table: "leads" | "invoices" | "nudge_log"): Promise<string[]> {
    const { rows } = await this.query<{ id: unknown }>(`SELECT id FROM ${table}`);
    return rows.map((row) => String(row.id));
  }

  private async fetchById(
    table: "leads" | "invoices" | "nudge_log",
    id: string,
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    const owner = requireOwnerId(userId);
    const { rows } = await this.query(`SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`, [
      id,
      owner,
    ]);
    const row = rows[0] ?? null;
    if (!row) return null;
    const rowOwner = ownerIdOf(asText(row.user_id));
    return isOwnedBy(owner, rowOwner) ? row : null;
  }

  private async requireRow(
    table: "leads" | "invoices" | "nudge_log",
    id: string,
    kind: "lead" | "invoice" | "nudge",
    userId: string,
  ): Promise<Record<string, unknown>> {
    const row = await this.fetchById(table, id, userId);
    if (!row) throw new Error(`No ${kind} with id ${id}`);
    return row;
  }

  private async requireRelatedRecord(
    userId: string,
    kind: NudgeKind,
    relatedId: string,
  ): Promise<void> {
    if (kind === "follow_up") {
      await this.requireRow("leads", relatedId, "lead", userId);
      return;
    }
    await this.requireRow("invoices", relatedId, "invoice", userId);
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

  private async updateOwned(
    table: string,
    columns: readonly string[],
    row: Record<string, unknown>,
    id: string,
    userId: string,
  ): Promise<void> {
    const owner = requireOwnerId(userId);
    const writable = writableColumns(columns);
    await this.query(
      `UPDATE ${table} SET ${sqlSet(writable)} WHERE id = $${writable.length + 1} AND user_id = $${writable.length + 2}`,
      [...dbValues(row, writable), id, owner],
    );
  }

  private async patchLead(userId: string, id: string, patch: Partial<Lead>): Promise<void> {
    const row = await this.fetchById("leads", id, userId);
    if (!row) return;
    const lead = { ...leadFromDb(row), ...patch };
    await this.updateOwned("leads", LEAD_DB_COLUMNS, leadToDb(lead), id, userId);
  }

  private async patchInvoice(userId: string, id: string, patch: Partial<Invoice>): Promise<void> {
    const row = await this.fetchById("invoices", id, userId);
    if (!row) return;
    const invoice = { ...invoiceFromDb(row), ...patch };
    await this.updateOwned("invoices", INVOICE_DB_COLUMNS, invoiceToDb(invoice), id, userId);
  }

  private async deleteRelatedDraftNudges(relatedId: string, userId: string): Promise<void> {
    await this.query(
      "DELETE FROM nudge_log WHERE related_id = $1 AND status = 'draft' AND user_id = $2",
      [relatedId, requireOwnerId(userId)],
    );
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

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value);
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
