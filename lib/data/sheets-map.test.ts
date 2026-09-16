import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextPrefixedId } from "./ids";
import { fixtureInvoices, fixtureLeads, fixtureNudges } from "./test-fixtures";
import {
  MISSING_SHEETS_CREDS,
  normalizePrivateKey,
  normalizeSpreadsheetId,
  readSheetsConfig,
} from "./sheets-config";
import {
  fieldsToCells,
  INVOICE_COLUMNS,
  invoiceFromRow,
  invoiceToFields,
  LEAD_COLUMNS,
  leadFromRow,
  leadToFields,
  NUDGE_COLUMNS,
  nudgeFromRow,
  nudgeToFields,
  zipRow,
} from "./sheets-map";

describe("sheets column mapping", () => {
  it("allocates the next prefixed id", () => {
    assert.equal(nextPrefixedId(["lead_001", "lead_007", "other"], "lead"), "lead_008");
    assert.equal(nextPrefixedId([], "inv"), "inv_001");
  });

  it("maps snake_case lead columns to camelCase and back", () => {
    const lead = fixtureLeads[0];
    const fields = leadToFields(lead);
    assert.equal(fields.last_contact_at, "2026-09-08");
    assert.equal(fields.next_follow_up_at, "2026-09-15");
    assert.equal(fields.created_at, "2026-09-01");
    const row = zipRow([...LEAD_COLUMNS], fieldsToCells([...LEAD_COLUMNS], fields));
    assert.deepEqual(leadFromRow(row), lead);
  });

  it("treats missing optional lead columns as undefined", () => {
    const lead = leadFromRow({
      id: "lead_009",
      name: "Ava Chen",
      email: "ava@example.com",
      status: "new",
      created_at: "2026-09-16",
    });
    assert.equal(lead.company, undefined);
    assert.equal(lead.lastContactAt, undefined);
    assert.equal(lead.nextFollowUpAt, undefined);
    assert.equal(lead.notes, undefined);
  });

  it("maps invoices and nudges, including empty optional cells", () => {
    const invoice = fixtureInvoices[1];
    const invoiceFields = invoiceToFields(invoice);
    assert.equal(invoiceFields.client_name, "Alex Rivera");
    assert.equal(invoiceFields.last_nudged_at, "");
    const invoiceRow = zipRow(
      [...INVOICE_COLUMNS],
      fieldsToCells([...INVOICE_COLUMNS], invoiceFields),
    );
    assert.deepEqual(invoiceFromRow(invoiceRow), invoice);

    const nudge = fixtureNudges[1];
    const nudgeFields = nudgeToFields(nudge);
    assert.equal(nudgeFields.related_id, "inv_001");
    assert.equal(nudgeFields.draft_text, nudge.draftText);
    const nudgeRow = zipRow([...NUDGE_COLUMNS], fieldsToCells([...NUDGE_COLUMNS], nudgeFields));
    assert.deepEqual(nudgeFromRow(nudgeRow), nudge);

    const failed = nudgeFromRow({
      id: "nudge_009",
      kind: "follow_up",
      related_id: "lead_001",
      channel: "email",
      draft_text: "Ping",
      status: "draft",
      scheduled_for: "2026-09-18T15:00:00.000Z",
      created_at: "2026-09-16",
      last_error: "Email didn’t send: rate limited",
      send_attempts: "2",
    });
    assert.equal(failed.scheduledFor, "2026-09-18T15:00:00.000Z");
    assert.equal(failed.lastError, "Email didn’t send: rate limited");
    assert.equal(failed.sendAttempts, 2);
    assert.equal(nudgeToFields(failed).send_attempts, "2");
  });

  it("keeps extra sheet columns when writing a patch", () => {
    const headers = ["id", "name", "email", "status", "created_at", "owner"];
    const existing = ["lead_001", "Sam Lee", "sam@example.com", "new", "2026-09-01", "keep-me"];
    const next = fieldsToCells(
      headers,
      {
        id: "lead_001",
        name: "Sam Lee",
        email: "sam@example.com",
        status: "waiting_on_them",
        created_at: "2026-09-01",
      },
      existing,
    );
    assert.equal(next[5], "keep-me");
    assert.equal(next[3], "waiting_on_them");
  });
});

describe("sheets credentials", () => {
  it("asks for the three Google env vars when any are missing", () => {
    const result = readSheetsConfig({});
    assert.deepEqual(result, { ok: false, error: MISSING_SHEETS_CREDS });
  });

  it("normalizes a spreadsheet URL and escaped private key", () => {
    assert.equal(
      normalizeSpreadsheetId("https://docs.google.com/spreadsheets/d/abc-123/edit#gid=0"),
      "abc-123",
    );
    assert.ok(normalizePrivateKey('"-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n"').includes("\nABC\n"));
    const ok = readSheetsConfig({
      GOOGLE_SHEETS_SPREADSHEET_ID: "sheet_1",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "svc@example.iam.gserviceaccount.com",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n",
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.config.spreadsheetId, "sheet_1");
      assert.ok(ok.config.privateKey.includes("\nABC\n"));
    }
  });
});
