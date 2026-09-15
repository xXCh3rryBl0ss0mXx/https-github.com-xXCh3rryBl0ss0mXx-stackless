import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { followUpDraftText, invoiceDraftText } from "./draft-text";
import { MemoryDataStore } from "./memory-store";
import { seedInvoices, seedLeads, seedNudges } from "./seed";
import { SHEETS_NOT_WIRED, SheetsDataStore } from "./sheets-store";
import type { StoreSnapshot } from "./types";

function freshStore() {
  return new MemoryDataStore({
    leads: seedLeads,
    invoices: seedInvoices,
    nudges: seedNudges,
  });
}

describe("MemoryDataStore", () => {
  it("lists leads due on or before today, including those with no date", async () => {
    const due = await freshStore().listLeadsNeedingFollowUp("2026-09-15");
    assert.deepEqual(
      due.map((lead) => lead.id),
      ["lead_001", "lead_002"],
    );
  });

  it("hides leads whose follow-up is still in the future", async () => {
    const due = await freshStore().listLeadsNeedingFollowUp("2026-09-14");
    assert.deepEqual(
      due.map((lead) => lead.id),
      ["lead_002"],
    );
  });

  it("lists only open invoices, and overdue ones separately", async () => {
    const store = freshStore();
    const open = await store.listOpenInvoices();
    const overdue = await store.listOverdueInvoices("2026-09-15");
    assert.deepEqual(
      open.map((invoice) => invoice.id),
      ["inv_001"],
    );
    assert.deepEqual(
      overdue.map((invoice) => invoice.id),
      ["inv_001"],
    );
    assert.deepEqual(await store.listOverdueInvoices("2026-08-15"), []);
  });

  it("creates, edits, sends, and skips drafts through the DataStore boundary", async () => {
    const store = new MemoryDataStore({
      leads: seedLeads,
      invoices: seedInvoices,
      nudges: [],
    });
    const draft = await store.createNudgeDraft({
      kind: "follow_up",
      relatedId: "lead_002",
      draftText: "Hey Jordan — just checking in.",
      scheduledFor: "2026-09-15",
    });
    assert.equal(draft.status, "draft");

    const edited = await store.updateNudgeDraft(draft.id, "Hey Jordan — logo package still on?");
    assert.equal(edited.draftText, "Hey Jordan — logo package still on?");

    await store.markNudgeSent(draft.id, "2026-09-15");
    const afterSent = (await store.listNudges()).find((row) => row.id === draft.id);
    assert.equal(afterSent?.status, "sent");
    assert.equal(afterSent?.sentAt, "2026-09-15");
    assert.equal((await store.getLead("lead_002"))?.lastContactAt, "2026-09-15");

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

  it("persists mutations through the optional snapshot writer", async () => {
    const writes: StoreSnapshot[] = [];
    const store = new MemoryDataStore(
      { leads: seedLeads, invoices: seedInvoices, nudges: [] },
      (snapshot) => writes.push(snapshot),
    );
    await store.createNudgeDraft({
      kind: "follow_up",
      relatedId: "lead_001",
      draftText: "Ping",
    });
    assert.equal(writes.length, 1);
    assert.equal(writes[0].nudges[0]?.draftText, "Ping");
  });
});

describe("draft copy", () => {
  it("writes a simple follow-up and invoice reminder", () => {
    assert.equal(
      followUpDraftText(seedLeads[0]),
      "Hey Sam — just checking in on this: Sent website quote Monday. Happy to tweak the scope if you want. Want to hop on a quick call this week?",
    );
    assert.equal(
      invoiceDraftText(seedInvoices[0]),
      "Hi Sam — friendly reminder that invoice #1042 ($850) is still open. I can resend the payment link if that helps. Thanks!",
    );
  });
});

describe("SheetsDataStore stub", () => {
  it("refuses to run until credentials are actually wired", async () => {
    const store = new SheetsDataStore();
    await assert.rejects(() => store.listOpenInvoices(), { message: SHEETS_NOT_WIRED });
  });
});
