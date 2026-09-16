import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MISSING_SHEETS_CREDS, type SheetsGateway } from "./sheets-config";
import {
  INVOICE_COLUMNS,
  LEAD_COLUMNS,
  NUDGE_COLUMNS,
  type SheetTable,
} from "./sheets-map";
import { SheetsDataStore } from "./sheets-store";
import { seedInvoices, seedLeads, seedNudges } from "./seed";
import { invoiceToFields, leadToFields, nudgeToFields, fieldsToCells } from "./sheets-map";

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
}

function seededGateway() {
  return new MemorySheetsGateway({
    leads: {
      headers: [...LEAD_COLUMNS],
      rows: seedLeads.map((lead) => fieldsToCells([...LEAD_COLUMNS], leadToFields(lead))),
    },
    invoices: {
      headers: [...INVOICE_COLUMNS],
      rows: seedInvoices.map((invoice) =>
        fieldsToCells([...INVOICE_COLUMNS], invoiceToFields(invoice)),
      ),
    },
    nudge_log: {
      headers: [...NUDGE_COLUMNS],
      rows: seedNudges.map((nudge) => fieldsToCells([...NUDGE_COLUMNS], nudgeToFields(nudge))),
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
      (await store.listLeadsNeedingFollowUp("2026-09-15")).map((lead) => lead.id),
      ["lead_001", "lead_002"],
    );
    assert.deepEqual(
      (await store.listOverdueInvoices("2026-09-15")).map((invoice) => invoice.id),
      ["inv_001"],
    );
  });

  it("creates and updates leads and invoices on the sheet tabs", async () => {
    const store = new SheetsDataStore({ gateway: seededGateway() });
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

  it("writes nudge drafts and send/skip back to nudge_log", async () => {
    const store = new SheetsDataStore({
      gateway: new MemorySheetsGateway({
        leads: {
          headers: [...LEAD_COLUMNS],
          rows: seedLeads.map((lead) => fieldsToCells([...LEAD_COLUMNS], leadToFields(lead))),
        },
        invoices: {
          headers: [...INVOICE_COLUMNS],
          rows: seedInvoices.map((invoice) =>
            fieldsToCells([...INVOICE_COLUMNS], invoiceToFields(invoice)),
          ),
        },
        nudge_log: { headers: [...NUDGE_COLUMNS], rows: [] },
      }),
    });
    const draft = await store.createNudgeDraft({
      kind: "follow_up",
      relatedId: "lead_002",
      draftText: "Hey Jordan",
      scheduledFor: "2026-09-15",
    });
    await store.updateNudgeDraft(draft.id, "Hey Jordan — still on?");
    await store.markNudgeSent(draft.id, "2026-09-15");
    assert.equal((await store.getLead("lead_002"))?.lastContactAt, "2026-09-15");
    const sent = (await store.listNudges()).find((row) => row.id === draft.id);
    assert.equal(sent?.status, "sent");
  });

  it("reads leads when optional columns are missing from the header", async () => {
    const store = new SheetsDataStore({
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
    const lead = await store.getLead("lead_009");
    assert.equal(lead?.company, undefined);
    assert.equal(lead?.notes, undefined);
    const invoice = await store.getInvoice("inv_009");
    assert.equal(invoice?.paymentLink, undefined);
    assert.equal(invoice?.lastNudgedAt, undefined);
    assert.equal(invoice?.amountUsd, 50);
  });
});
