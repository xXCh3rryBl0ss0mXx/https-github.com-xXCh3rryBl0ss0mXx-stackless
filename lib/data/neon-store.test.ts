import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  MISSING_NEON_URL,
  missingNeonUrlMessage,
  readNeonConfig,
} from "./neon-config";
import { invoiceToDb, leadToDb, nudgeToDb } from "./neon-map";
import { SCHEMA_SQL, SCHEMA_STATEMENTS } from "./neon-schema";
import type { SqlClient, SqlQueryResult } from "./neon-sql";
import { NeonDataStore } from "./neon-store";
import { fixtureInvoices, fixtureLeads, fixtureNudges } from "./test-fixtures";

type Row = Record<string, unknown>;

const TABLES = ["leads", "invoices", "nudge_log"] as const;
type TableName = (typeof TABLES)[number];

function normalizeSql(text: string): string {
  return text.replace(/\s+/g, " ").trim().replace(/;+$/, "");
}

function isTable(name: string): name is TableName {
  return (TABLES as readonly string[]).includes(name);
}

/** In-memory stand-in for Neon/pg: enough SQL for NeonDataStore. */
class FakeSqlClient implements SqlClient {
  readonly tables: Record<TableName, Row[]> = {
    leads: [],
    invoices: [],
    nudge_log: [],
  };

  async query<T = Record<string, unknown>>(
    text: string,
    params: unknown[] = [],
  ): Promise<SqlQueryResult<T>> {
    const sql = normalizeSql(text);
    if (/^CREATE\b/i.test(sql)) {
      return { rows: [] };
    }

    const insert = /^INSERT INTO (\w+) \((.+)\) VALUES \((.+)\)$/i.exec(sql);
    if (insert) {
      const table = this.table(insert[1]);
      const columns = splitList(insert[2]);
      const values = splitList(insert[3]).map((token) => this.valueToken(token, params));
      const row: Row = {};
      columns.forEach((column, index) => {
        row[column] = values[index] ?? null;
      });
      table.push(row);
      return { rows: [clone(row) as T] };
    }

    const update = /^UPDATE (\w+) SET (.+) WHERE (.+)$/i.exec(sql);
    if (update) {
      const table = this.table(update[1]);
      const assignments = splitList(update[2]).map((part) => {
        const set = /^(\w+)\s*=\s*(.+)$/.exec(part);
        if (!set) throw new Error(`Unsupported SET clause: ${part}`);
        return { column: set[1], value: this.valueToken(set[2], params) };
      });
      const matched = table.filter((row) => this.matchesWhere(row, update[3], params));
      for (const row of matched) {
        for (const assignment of assignments) {
          row[assignment.column] = assignment.value;
        }
      }
      return { rows: matched.map((row) => clone(row) as T) };
    }

    const del = /^DELETE FROM (\w+) WHERE (.+)$/i.exec(sql);
    if (del) {
      const table = this.table(del[1]);
      const keep: Row[] = [];
      const removed: Row[] = [];
      for (const row of table) {
        if (this.matchesWhere(row, del[2], params)) removed.push(row);
        else keep.push(row);
      }
      table.splice(0, table.length, ...keep);
      return { rows: removed.map((row) => clone(row) as T) };
    }

    const select = /^SELECT (.+) FROM (\w+)(?: WHERE (.+))?$/i.exec(sql);
    if (select) {
      const table = this.table(select[2]);
      const filtered = table.filter((row) =>
        select[3] ? this.matchesWhere(row, select[3], params) : true,
      );
      const columns = select[1].trim();
      const rows = filtered.map((row) => {
        if (columns === "*") return clone(row);
        const projected: Row = {};
        for (const column of splitList(columns)) {
          projected[column] = row[column];
        }
        return projected;
      });
      return { rows: rows as T[] };
    }

    throw new Error(`Unsupported SQL: ${sql}`);
  }

  private table(name: string): Row[] {
    const key = name.toLowerCase();
    if (!isTable(key)) throw new Error(`Unknown table ${name}`);
    return this.tables[key];
  }

  private matchesWhere(row: Row, where: string, params: unknown[]): boolean {
    return where.split(/\s+AND\s+/i).every((clause) => {
      const trimmed = clause.trim();
      const placeholder = /^(\w+)\s*=\s*\$(\d+)$/.exec(trimmed);
      if (placeholder) {
        return sameValue(row[placeholder[1]], params[Number(placeholder[2]) - 1]);
      }
      const literal = /^(\w+)\s*=\s*'([^']*)'$/.exec(trimmed);
      if (literal) {
        return sameValue(row[literal[1]], literal[2]);
      }
      throw new Error(`Unsupported WHERE clause: ${clause}`);
    });
  }

  private valueToken(token: string, params: unknown[]): unknown {
    const trimmed = token.trim();
    if (/^null$/i.test(trimmed)) return null;
    const placeholder = /^\$(\d+)$/.exec(trimmed);
    if (!placeholder) throw new Error(`Unsupported SQL value: ${token}`);
    const value = params[Number(placeholder[1]) - 1];
    return value === undefined ? null : value;
  }
}

function splitList(list: string): string[] {
  return list.split(",").map((part) => part.trim());
}

function clone(row: Row): Row {
  return { ...row };
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left == null && right == null) return true;
  return String(left) === String(right);
}

function seededClient() {
  const client = new FakeSqlClient();
  client.tables.leads = fixtureLeads.map((lead) => leadToDb(lead));
  client.tables.invoices = fixtureInvoices.map((invoice) => invoiceToDb(invoice));
  client.tables.nudge_log = fixtureNudges.map((nudge) => nudgeToDb(nudge));
  return client;
}

describe("Neon config", () => {
  it("asks for DATABASE_URL when neon mode has none", () => {
    const result = readNeonConfig({});
    assert.deepEqual(result, { ok: false, error: MISSING_NEON_URL });
    const postgres = readNeonConfig({ STACKLESS_DATA_STORE: "postgres" });
    assert.equal(postgres.ok, false);
    if (!postgres.ok) {
      assert.equal(postgres.error, missingNeonUrlMessage("postgres"));
    }
  });

  it("accepts a trimmed connection string", () => {
    const result = readNeonConfig({
      DATABASE_URL: "  postgres://user:pass@host/neondb  ",
    });
    assert.deepEqual(result, {
      ok: true,
      databaseUrl: "postgres://user:pass@host/neondb",
    });
  });

  it("throws the peach-page error when constructed without DATABASE_URL", () => {
    assert.throws(() => new NeonDataStore({ env: {} }), { message: MISSING_NEON_URL });
    assert.throws(
      () => new NeonDataStore({ env: { STACKLESS_DATA_STORE: "postgres" } }),
      { message: missingNeonUrlMessage("postgres") },
    );
  });
});

describe("schema.sql", () => {
  it("matches the bootstrap statements (leads, invoices, nudge_log)", () => {
    const file = readFileSync(join(process.cwd(), "data/schema.sql"), "utf8");
    assert.match(file, /CREATE TABLE IF NOT EXISTS leads/);
    assert.match(file, /CREATE TABLE IF NOT EXISTS invoices/);
    assert.match(file, /CREATE TABLE IF NOT EXISTS nudge_log/);
    assert.match(file, /scheduled_for/);
    assert.match(file, /last_error/);
    assert.match(file, /send_attempts/);
    assert.equal(SCHEMA_STATEMENTS.length, 7);
    assert.match(SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS leads/);
  });
});

describe("NeonDataStore", () => {
  it("lists due leads and overdue invoices from SQL rows", async () => {
    const store = new NeonDataStore({ client: seededClient() });
    assert.deepEqual(
      (await store.listLeadsNeedingFollowUp("2026-09-15")).map((lead) => lead.id),
      ["lead_001", "lead_002"],
    );
    assert.deepEqual(
      (await store.listOverdueInvoices("2026-09-15")).map((invoice) => invoice.id),
      ["inv_001"],
    );
    assert.deepEqual(
      (await store.listOpenInvoices()).map((invoice) => invoice.id),
      ["inv_001"],
    );
  });

  it("creates and updates leads and invoices", async () => {
    const store = new NeonDataStore({ client: seededClient() });
    const lead = await store.createLead({
      name: "Ava Chen",
      email: "ava@example.com",
      status: "new",
      nextFollowUpAt: "2026-09-16",
    });
    assert.equal(lead.id, "lead_003");
    assert.ok(
      (await store.listLeadsNeedingFollowUp("2026-09-16")).some((row) => row.id === lead.id),
    );

    await store.updateLead(lead.id, {
      name: "Ava Chen",
      email: "ava@example.com",
      status: "won",
      nextFollowUpAt: "2026-09-16",
    });
    assert.ok(
      !(await store.listLeadsNeedingFollowUp("2026-09-16")).some((row) => row.id === lead.id),
    );

    const invoice = await store.createInvoice({
      clientName: "Riley Moss",
      clientEmail: "riley@example.com",
      invoiceNumber: "1044",
      amountUsd: 400,
      status: "open",
      dueDate: "2026-09-16",
    });
    assert.equal(invoice.id, "inv_003");
    assert.ok(
      (await store.listOverdueInvoices("2026-09-16")).some((row) => row.id === invoice.id),
    );

    await store.updateInvoice(invoice.id, {
      clientName: "Riley Moss",
      clientEmail: "riley@example.com",
      invoiceNumber: "1044",
      amountUsd: 400,
      status: "paid",
      dueDate: "2026-09-16",
    });
    assert.ok(
      !(await store.listOverdueInvoices("2026-09-16")).some((row) => row.id === invoice.id),
    );
  });

  it("writes nudge drafts and send/skip, including last_error / send_attempts", async () => {
    const client = new FakeSqlClient();
    client.tables.leads = fixtureLeads.map((lead) => leadToDb(lead));
    client.tables.invoices = fixtureInvoices.map((invoice) => invoiceToDb(invoice));
    const store = new NeonDataStore({ client });

    const draft = await store.createNudgeDraft({
      kind: "follow_up",
      relatedId: "lead_002",
      draftText: "Hey Jordan",
      scheduledFor: "2026-09-15",
    });
    assert.equal(draft.id, "nudge_001");
    await store.updateNudgeDraft(draft.id, {
      draftText: "Hey Jordan — still on?",
      scheduledFor: "2026-09-18T15:00:00.000Z",
    });
    const scheduled = (await store.listNudges()).find((row) => row.id === draft.id);
    assert.equal(scheduled?.scheduledFor, "2026-09-18T15:00:00.000Z");

    await store.recordNudgeSendFailure(draft.id, "Email didn’t send: timeout");
    const failed = (await store.listNudges()).find((row) => row.id === draft.id);
    assert.equal(failed?.status, "draft");
    assert.equal(failed?.sendAttempts, 1);
    assert.match(failed?.lastError ?? "", /timeout/);

    const retried = await store.updateNudgeDraft(draft.id, {
      draftText: "Hey Jordan — still on?",
      scheduledFor: "2026-09-18T15:00:00.000Z",
    });
    assert.equal(retried.sendAttempts, undefined);
    assert.equal(retried.lastError, undefined);

    await store.markNudgeSent(draft.id, "2026-09-15");
    assert.equal((await store.getLead("lead_002"))?.lastContactAt, "2026-09-15");
    const sent = (await store.listNudges()).find((row) => row.id === draft.id);
    assert.equal(sent?.status, "sent");
    assert.equal(sent?.sentAt, "2026-09-15");
    assert.equal(sent?.lastError, undefined);
    assert.equal(sent?.sendAttempts, undefined);

    const skip = await store.createNudgeDraft({
      kind: "invoice",
      relatedId: "inv_001",
      draftText: "Hi Sam — reminder.",
    });
    await store.markNudgeSkipped(skip.id);
    const afterSkip = (await store.listNudges()).find((row) => row.id === skip.id);
    assert.equal(afterSkip?.status, "skipped");
    assert.equal((await store.getInvoice("inv_001"))?.lastNudgedAt, "2026-09-10");
  });

  it("deletes lead and invoice rows, plus related draft nudges", async () => {
    const client = seededClient();
    client.tables.nudge_log.push(
      nudgeToDb({
        id: "nudge_010",
        kind: "follow_up",
        relatedId: "lead_001",
        channel: "email",
        draftText: "Second draft",
        status: "draft",
        createdAt: "2026-09-15",
      }),
      nudgeToDb({
        id: "nudge_011",
        kind: "invoice",
        relatedId: "inv_001",
        channel: "email",
        draftText: "Pay up?",
        status: "draft",
        createdAt: "2026-09-15",
      }),
    );
    const store = new NeonDataStore({ client });

    await store.deleteLead("lead_001");
    assert.equal(await store.getLead("lead_001"), null);
    assert.ok((await store.listLeads()).some((lead) => lead.id === "lead_002"));
    const afterLead = await store.listNudges();
    assert.equal(
      afterLead.find((nudge) => nudge.id === "nudge_001"),
      undefined,
    );
    assert.equal(
      afterLead.find((nudge) => nudge.id === "nudge_010"),
      undefined,
    );
    assert.equal(afterLead.find((nudge) => nudge.id === "nudge_002")?.status, "sent");

    await store.deleteInvoice("inv_001");
    assert.equal(await store.getInvoice("inv_001"), null);
    const afterInvoice = await store.listNudges();
    assert.equal(
      afterInvoice.find((nudge) => nudge.id === "nudge_011"),
      undefined,
    );
    assert.equal(afterInvoice.find((nudge) => nudge.id === "nudge_002")?.status, "sent");

    await assert.rejects(() => store.deleteLead("lead_001"), /No lead with id lead_001/);
    await assert.rejects(() => store.deleteInvoice("inv_001"), /No invoice with id inv_001/);
  });

  it("bootstraps schema before the first query", async () => {
    const statements: string[] = [];
    const inner = seededClient();
    const client: SqlClient = {
      async query(text, params) {
        statements.push(normalizeSql(text));
        return inner.query(text, params);
      },
    };
    const store = new NeonDataStore({ client });
    await store.listLeads();
    assert.equal(statements[0], normalizeSql(SCHEMA_STATEMENTS[0]));
    assert.ok(statements.some((sql) => sql.startsWith("CREATE TABLE IF NOT EXISTS nudge_log")));
    assert.ok(statements.some((sql) => sql === "SELECT * FROM leads"));
    statements.length = 0;
    await store.listInvoices();
    assert.ok(statements.every((sql) => !sql.startsWith("CREATE ")));
  });
});
