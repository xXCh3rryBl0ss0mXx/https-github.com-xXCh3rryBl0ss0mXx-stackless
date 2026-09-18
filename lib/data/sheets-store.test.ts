import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MISSING_SHEETS_CREDS, type SheetsGateway } from "./sheets-config";
import {
  INVOICE_COLUMNS,
  LEAD_COLUMNS,
  NUDGE_COLUMNS,
  type SheetTable,
  invoiceToFields,
  leadToFields,
  nudgeToFields,
  fieldsToCells,
} from "./sheets-map";
import { SheetsDataStore } from "./sheets-store";
import { assertTenantIsolation, assertUnownedRowsHidden } from "./tenant-isolation";
import { FIXTURE_USER_ID, fixtureInvoices, fixtureLeads, fixtureNudges } from "./test-fixtures";
import { SHEETS_WAITLIST_UNSUPPORTED } from "./waitlist";

const OWNER = FIXTURE_USER_ID;

class MemorySheetsGateway implements SheetsGateway {
  constructor(private readonly tables: Record<string, SheetTable>) {}

  async read(tab: string): Promise<SheetTable> {
    const table = this.tables[tab];
    if (!table) throw new Error(`Missing tab ${tab}`);
    return {
      headers: [...table.headers],
      rows: table.rows.map((row) => [...row]),
    };
  }

  async appendRow(tab: string, values: string[]): Promise<void> {
    this.tables[tab].rows.push([...values]);
  }

  async updateRow(tab: string, dataRowIndex: number, values: string[]): Promise<void> {
    this.tables[tab].rows[dataRowIndex] = [...values];
  }

  async deleteRow(tab: string, dataRowIndex: number): Promise<void> {
    const table = this.tables[tab];
    if (dataRowIndex < 0 || dataRowIndex >= table.rows.length) {
      throw new Error(`No row ${dataRowIndex} on ${tab}`);
    }
    table.rows.splice(dataRowIndex, 1);
  }
}

function seededGateway() {
  return new MemorySheetsGateway({
    leads: {
      headers: [...LEAD_COLUMNS],
      rows: fixtureLeads.map((lead) => fieldsToCells([...LEAD_COLUMNS], leadToFields(lead))),
    },
    invoices: {
      headers: [...INVOICE_COLUMNS],
      rows: fixtureInvoices.map((invoice) =>
        fieldsToCells([...INVOICE_COLUMNS], invoiceToFields(invoice)),
      ),
    },
    nudge_log: {
      headers: [...NUDGE_COLUMNS],
      rows: fixtureNudges.map((nudge) => fieldsToCells([...NUDGE_COLUMNS], nudgeToFields(nudge))),
    },
  });
}

describe("SheetsDataStore", () => {
  it("throws a clear error when Google credentials are missing", () => {
    assert.throws(() => new SheetsDataStore({ env: {} }), { message: MISSING_SHEETS_CREDS });
  });

  it("lists due leads and overdue invoices from sheet rows", async () => {
    const store = new SheetsDataStore({ gateway: seededGateway() });
    assert.deepEqual(
      (await store.listLeadsNeedingFollowUp(OWNER, "2026-09-15")).map((lead) => lead.id),
      ["lead_001", "lead_002"],
    );
    assert.deepEqual(
      (await store.listOverdueInvoices(OWNER, "2026-09-15")).map((invoice) => invoice.id),
      ["inv_001"],
    );
  });

  it("creates and updates leads and invoices on the sheet tabs", async () => {
    const store = new SheetsDataStore({ gateway: seededGateway() });
    const lead = await store.createLead(OWNER, {
      name: "Ava Chen",
      email: "ava@example.com",
      status: "new",
      nextFollowUpAt: "2026-09-16",
    });
    assert.equal(lead.id, "lead_003");
    assert.ok(
      (await store.listLeadsNeedingFollowUp(OWNER, "2026-09-16")).some((row) => row.id === lead.id),
    );

    await store.updateLead(OWNER, lead.id, {
      name: "Ava Chen",
      email: "ava@example.com",
      status: "won",
      nextFollowUpAt: "2026-09-16",
    });
    assert.ok(
      !(await store.listLeadsNeedingFollowUp(OWNER, "2026-09-16")).some((row) => row.id === lead.id),
    );

    const invoice = await store.createInvoice(OWNER, {
      clientName: "Riley Moss",
      clientEmail: "riley@example.com",
      invoiceNumber: "1044",
      amountUsd: 400,
      status: "open",
      dueDate: "2026-09-16",
    });
    assert.equal(invoice.id, "inv_003");
    assert.ok(
      (await store.listOverdueInvoices(OWNER, "2026-09-16")).some((row) => row.id === invoice.id),
    );

    await store.updateInvoice(OWNER, invoice.id, {
      clientName: "Riley Moss",
      clientEmail: "riley@example.com",
      invoiceNumber: "1044",
      amountUsd: 400,
      status: "paid",
      dueDate: "2026-09-16",
    });
    assert.ok(
      !(await store.listOverdueInvoices(OWNER, "2026-09-16")).some((row) => row.id === invoice.id),
    );
  });

  it("writes nudge drafts and send/skip back to nudge_log", async () => {
    const store = new SheetsDataStore({
      gateway: new MemorySheetsGateway({
        leads: {
          headers: [...LEAD_COLUMNS],
          rows: fixtureLeads.map((lead) => fieldsToCells([...LEAD_COLUMNS], leadToFields(lead))),
        },
        invoices: {
          headers: [...INVOICE_COLUMNS],
          rows: fixtureInvoices.map((invoice) =>
            fieldsToCells([...INVOICE_COLUMNS], invoiceToFields(invoice)),
          ),
        },
        nudge_log: { headers: [...NUDGE_COLUMNS], rows: [] },
      }),
    });
    const draft = await store.createNudgeDraft(OWNER, {
      kind: "follow_up",
      relatedId: "lead_002",
      draftText: "Hey Jordan",
      scheduledFor: "2026-09-15",
    });
    await store.updateNudgeDraft(OWNER, draft.id, {
      draftText: "Hey Jordan — still on?",
      scheduledFor: "2026-09-18T15:00:00.000Z",
    });
    const scheduled = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    assert.equal(scheduled?.scheduledFor, "2026-09-18T15:00:00.000Z");
    await store.recordNudgeSendFailure(OWNER, draft.id, "Email didn’t send: timeout");
    const failed = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    assert.equal(failed?.status, "draft");
    assert.equal(failed?.sendAttempts, 1);
    await store.markNudgeSent(OWNER, draft.id, "2026-09-15");
    assert.equal((await store.getLead(OWNER, "lead_002"))?.lastContactAt, "2026-09-15");
    const sent = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    assert.equal(sent?.status, "sent");
  });

  it("hides rows when user_id is missing and still reads other optional columns", async () => {
    const unowned = new SheetsDataStore({
      gateway: new MemorySheetsGateway({
        leads: {
          headers: ["id", "name", "email", "status", "created_at"],
          rows: [["lead_009", "Ava Chen", "ava@example.com", "new", "2026-09-16"]],
        },
        invoices: {
          headers: [
            "id",
            "client_name",
            "client_email",
            "invoice_number",
            "amount_usd",
            "status",
            "due_date",
            "created_at",
          ],
          rows: [
            [
              "inv_009",
              "Riley Moss",
              "riley@example.com",
              "1099",
              "50",
              "open",
              "2026-09-01",
              "2026-08-01",
            ],
          ],
        },
        nudge_log: { headers: [...NUDGE_COLUMNS], rows: [] },
      }),
    });
    assert.equal(await unowned.getLead(OWNER, "lead_009"), null);
    assert.equal(await unowned.getInvoice(OWNER, "inv_009"), null);

    const store = new SheetsDataStore({
      gateway: new MemorySheetsGateway({
        leads: {
          headers: ["id", "name", "email", "status", "created_at", "user_id"],
          rows: [["lead_009", "Ava Chen", "ava@example.com", "new", "2026-09-16", OWNER]],
        },
        invoices: {
          headers: [
            "id",
            "client_name",
            "client_email",
            "invoice_number",
            "amount_usd",
            "status",
            "due_date",
            "created_at",
            "user_id",
          ],
          rows: [
            [
              "inv_009",
              "Riley Moss",
              "riley@example.com",
              "1099",
              "50",
              "open",
              "2026-09-01",
              "2026-08-01",
              OWNER,
            ],
          ],
        },
        nudge_log: { headers: [...NUDGE_COLUMNS], rows: [] },
      }),
    });
    const lead = await store.getLead(OWNER, "lead_009");
    assert.equal(lead?.company, undefined);
    assert.equal(lead?.notes, undefined);
    const invoice = await store.getInvoice(OWNER, "inv_009");
    assert.equal(invoice?.paymentLink, undefined);
    assert.equal(invoice?.lastNudgedAt, undefined);
    assert.equal(invoice?.amountUsd, 50);
  });

  it("deletes lead and invoice rows, plus related draft nudges", async () => {
    const gateway = new MemorySheetsGateway({
      leads: {
        headers: [...LEAD_COLUMNS],
        rows: fixtureLeads.map((lead) => fieldsToCells([...LEAD_COLUMNS], leadToFields(lead))),
      },
      invoices: {
        headers: [...INVOICE_COLUMNS],
        rows: fixtureInvoices.map((invoice) =>
          fieldsToCells([...INVOICE_COLUMNS], invoiceToFields(invoice)),
        ),
      },
      nudge_log: {
        headers: [...NUDGE_COLUMNS],
        rows: [
          ...fixtureNudges.map((nudge) => fieldsToCells([...NUDGE_COLUMNS], nudgeToFields(nudge))),
          fieldsToCells(
            [...NUDGE_COLUMNS],
            nudgeToFields({
              id: "nudge_010",
              kind: "follow_up",
              relatedId: "lead_001",
              channel: "email",
              draftText: "Second draft",
              status: "draft",
              createdAt: "2026-09-15",
            }),
          ),
          fieldsToCells(
            [...NUDGE_COLUMNS],
            nudgeToFields({
              id: "nudge_011",
              kind: "invoice",
              relatedId: "inv_001",
              channel: "email",
              draftText: "Pay up?",
              status: "draft",
              createdAt: "2026-09-15",
            }),
          ),
        ],
      },
    });
    const store = new SheetsDataStore({ gateway });

    await store.deleteLead(OWNER, "lead_001");
    assert.equal(await store.getLead(OWNER, "lead_001"), null);
    assert.ok((await store.listLeads(OWNER)).some((lead) => lead.id === "lead_002"));
    const afterLead = await store.listNudges(OWNER);
    assert.equal(
      afterLead.find((nudge) => nudge.id === "nudge_001"),
      undefined,
    );
    assert.equal(
      afterLead.find((nudge) => nudge.id === "nudge_010"),
      undefined,
    );
    assert.equal(afterLead.find((nudge) => nudge.id === "nudge_002")?.status, "sent");
    const leadRows = (await gateway.read("leads")).rows;
    assert.equal(
      leadRows.some((row) => row[0] === "lead_001"),
      false,
    );

    await store.deleteInvoice(OWNER, "inv_001");
    assert.equal(await store.getInvoice(OWNER, "inv_001"), null);
    const afterInvoice = await store.listNudges(OWNER);
    assert.equal(
      afterInvoice.find((nudge) => nudge.id === "nudge_011"),
      undefined,
    );
    assert.equal(afterInvoice.find((nudge) => nudge.id === "nudge_002")?.status, "sent");
    const invoiceRows = (await gateway.read("invoices")).rows;
    assert.equal(
      invoiceRows.some((row) => row[0] === "inv_001"),
      false,
    );

    await assert.rejects(() => store.deleteLead(OWNER, "lead_001"), /No lead with id lead_001/);
    await assert.rejects(() => store.deleteInvoice(OWNER, "inv_001"), /No invoice with id inv_001/);
  });

  it("isolates people and invoices by Clerk user id and hides unowned rows", async () => {
    const gateway = new MemorySheetsGateway({
      leads: {
        headers: [...LEAD_COLUMNS],
        rows: [
          fieldsToCells(
            [...LEAD_COLUMNS],
            leadToFields({
              id: "lead_legacy",
              name: "Legacy Person",
              email: "legacy@example.com",
              status: "new",
              createdAt: "2026-01-01",
            }),
          ),
        ],
      },
      invoices: {
        headers: [...INVOICE_COLUMNS],
        rows: [
          fieldsToCells(
            [...INVOICE_COLUMNS],
            invoiceToFields({
              id: "inv_legacy",
              clientName: "Legacy Client",
              clientEmail: "legacy@example.com",
              invoiceNumber: "9",
              amountUsd: 1,
              status: "open",
              dueDate: "2026-01-01",
              createdAt: "2026-01-01",
            }),
          ),
        ],
      },
      nudge_log: { headers: [...NUDGE_COLUMNS], rows: [] },
    });
    const store = new SheetsDataStore({ gateway });
    await assertUnownedRowsHidden(store, "lead_legacy", "inv_legacy");
    await assertTenantIsolation(store);
    assert.equal(
      (await gateway.read("leads")).rows.some((row) => row[0] === "lead_legacy"),
      true,
    );
  });

  it("does not claim a waitlist email was saved", async () => {
    const store = new SheetsDataStore({ gateway: seededGateway() });
    await assert.rejects(() => store.addWaitlistSignup("alex@studio.com"), {
      message: SHEETS_WAITLIST_UNSUPPORTED,
    });
  });
});
