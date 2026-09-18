import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { followUpDraftText, invoiceDraftText } from "./draft-text";
import { MemoryDataStore } from "./memory-store";
import { invoiceWriteFromForm, leadWriteFromForm } from "./record-input";
import { seedInvoices, seedLeads, seedNudges } from "./seed";
import { assertTenantIsolation, assertUnownedRowsHidden } from "./tenant-isolation";
import { FIXTURE_USER_ID, fixtureInvoices, fixtureLeads, fixtureSnapshot } from "./test-fixtures";
import type { StoreSnapshot } from "./types";

const OWNER = FIXTURE_USER_ID;

function freshStore() {
  return new MemoryDataStore(fixtureSnapshot());
}

describe("MemoryDataStore", () => {
  it("starts empty when no seed is provided", async () => {
    assert.deepEqual(seedLeads, []);
    assert.deepEqual(seedInvoices, []);
    assert.deepEqual(seedNudges, []);
    const store = new MemoryDataStore();
    assert.deepEqual(await store.listLeads(OWNER), []);
    assert.deepEqual(await store.listInvoices(OWNER), []);
    assert.deepEqual(await store.listNudges(OWNER), []);
    assert.deepEqual(await store.listLeadsNeedingFollowUp(OWNER, "2026-09-15"), []);
    assert.deepEqual(await store.listOverdueInvoices(OWNER, "2026-09-15"), []);
  });

  it("lists leads due on or before today, including those with no date", async () => {
    const due = await freshStore().listLeadsNeedingFollowUp(OWNER, "2026-09-15");
    assert.deepEqual(
      due.map((lead) => lead.id),
      ["lead_001", "lead_002"],
    );
  });

  it("hides leads whose follow-up is still in the future", async () => {
    const due = await freshStore().listLeadsNeedingFollowUp(OWNER, "2026-09-14");
    assert.deepEqual(
      due.map((lead) => lead.id),
      ["lead_002"],
    );
  });

  it("lists only open invoices, and overdue ones separately", async () => {
    const store = freshStore();
    const open = await store.listOpenInvoices(OWNER);
    const overdue = await store.listOverdueInvoices(OWNER, "2026-09-15");
    assert.deepEqual(
      open.map((invoice) => invoice.id),
      ["inv_001"],
    );
    assert.deepEqual(
      overdue.map((invoice) => invoice.id),
      ["inv_001"],
    );
    assert.deepEqual(await store.listOverdueInvoices(OWNER, "2026-08-15"), []);
  });

  it("creates, edits, sends, and skips drafts through the DataStore boundary", async () => {
    const store = new MemoryDataStore(fixtureSnapshot({ nudges: [] }));
    const draft = await store.createNudgeDraft(OWNER, {
      kind: "follow_up",
      relatedId: "lead_002",
      draftText: "Hey Jordan — just checking in.",
      scheduledFor: "2026-09-15",
    });
    assert.equal(draft.status, "draft");

    const edited = await store.updateNudgeDraft(OWNER, draft.id, {
      draftText: "Hey Jordan — logo package still on?",
      scheduledFor: "2026-09-18T15:00:00.000Z",
    });
    assert.equal(edited.draftText, "Hey Jordan — logo package still on?");
    assert.equal(edited.scheduledFor, "2026-09-18T15:00:00.000Z");

    const kept = await store.updateNudgeDraft(OWNER, draft.id, {
      draftText: "Hey Jordan — still logo?",
    });
    assert.equal(kept.scheduledFor, "2026-09-18T15:00:00.000Z");

    await store.recordNudgeSendFailure(OWNER, draft.id, "Email didn’t send: timeout");
    const failed = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    assert.equal(failed?.status, "draft");
    assert.equal(failed?.sendAttempts, 1);
    assert.match(failed?.lastError ?? "", /timeout/);

    const retried = await store.updateNudgeDraft(OWNER, draft.id, {
      draftText: "Hey Jordan — still logo?",
      scheduledFor: "2026-09-18T15:00:00.000Z",
    });
    assert.equal(retried.sendAttempts, undefined);
    assert.equal(retried.lastError, undefined);

    await store.markNudgeSent(OWNER, draft.id, "2026-09-15");
    const afterSent = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    assert.equal(afterSent?.status, "sent");
    assert.equal(afterSent?.sentAt, "2026-09-15");
    assert.equal((await store.getLead(OWNER, "lead_002"))?.lastContactAt, "2026-09-15");

    const skip = await store.createNudgeDraft(OWNER, {
      kind: "invoice",
      relatedId: "inv_001",
      draftText: "Hi Sam — reminder.",
    });
    await store.markNudgeSkipped(OWNER, skip.id);
    const afterSkip = (await store.listNudges(OWNER)).find((row) => row.id === skip.id);
    assert.equal(afterSkip?.status, "skipped");
    assert.equal((await store.getInvoice(OWNER, "inv_001"))?.lastNudgedAt, "2026-09-10");
  });

  it("creates and updates leads, including landing them on today’s list", async () => {
    const store = freshStore();
    const created = await store.createLead(OWNER, {
      name: "Ava Chen",
      email: "ava@example.com",
      company: "Chen Co",
      status: "new",
      nextFollowUpAt: "2026-09-16",
      notes: "Intro call",
    });
    assert.equal(created.id, "lead_003");
    assert.match(created.createdAt, /^\d{4}-\d{2}-\d{2}$/);

    const due = await store.listLeadsNeedingFollowUp(OWNER, "2026-09-16");
    assert.ok(due.some((lead) => lead.id === created.id));

    const updated = await store.updateLead(OWNER, created.id, {
      name: "Ava Chen",
      email: "ava@example.com",
      status: "waiting_on_them",
      nextFollowUpAt: "2026-10-01",
      notes: "Pushed a week",
    });
    assert.equal(updated.status, "waiting_on_them");
    assert.equal(updated.company, undefined);
    const later = await store.listLeadsNeedingFollowUp(OWNER, "2026-09-16");
    assert.ok(!later.some((lead) => lead.id === created.id));
    assert.ok((await store.listLeads(OWNER)).some((lead) => lead.id === created.id));
  });

  it("creates and updates invoices, including overdue open bills", async () => {
    const store = freshStore();
    const created = await store.createInvoice(OWNER, {
      clientName: "Riley Moss",
      clientEmail: "riley@example.com",
      invoiceNumber: "1044",
      amountUsd: 400,
      status: "open",
      dueDate: "2026-09-16",
      paymentLink: "https://pay.example.com/1044",
    });
    assert.equal(created.id, "inv_003");
    assert.ok(
      (await store.listOverdueInvoices(OWNER, "2026-09-16")).some((invoice) => invoice.id === created.id),
    );

    const paid = await store.updateInvoice(OWNER, created.id, {
      clientName: "Riley Moss",
      clientEmail: "riley@example.com",
      invoiceNumber: "1044",
      amountUsd: 400,
      status: "paid",
      dueDate: "2026-09-16",
      paymentLink: "https://pay.example.com/1044",
    });
    assert.equal(paid.status, "paid");
    assert.ok(
      !(await store.listOverdueInvoices(OWNER, "2026-09-16")).some((invoice) => invoice.id === created.id),
    );
  });

  it("deletes leads and their draft nudges, leaving sent history", async () => {
    const writes: StoreSnapshot[] = [];
    const store = new MemoryDataStore(
      fixtureSnapshot(),
      (snapshot) => writes.push(snapshot),
    );
    await store.deleteLead(OWNER, "lead_001");
    assert.equal(await store.getLead(OWNER, "lead_001"), null);
    assert.ok((await store.listLeads(OWNER)).some((lead) => lead.id === "lead_002"));
    const nudges = await store.listNudges(OWNER);
    assert.equal(
      nudges.find((nudge) => nudge.id === "nudge_001"),
      undefined,
    );
    assert.equal(nudges.find((nudge) => nudge.id === "nudge_002")?.status, "sent");
    assert.equal(writes.length, 1);
    assert.equal(
      writes[0].leads.find((lead) => lead.id === "lead_001"),
      undefined,
    );
    assert.equal(
      writes[0].nudges.find((nudge) => nudge.id === "nudge_001"),
      undefined,
    );
    await assert.rejects(() => store.deleteLead(OWNER, "lead_001"), /No lead with id lead_001/);
  });

  it("deletes invoices and their draft nudges, leaving sent history", async () => {
    const store = freshStore();
    const draft = await store.createNudgeDraft(OWNER, {
      kind: "invoice",
      relatedId: "inv_001",
      draftText: "Hi Sam — still open?",
    });
    await store.deleteInvoice(OWNER, "inv_001");
    assert.equal(await store.getInvoice(OWNER, "inv_001"), null);
    assert.ok((await store.listInvoices(OWNER)).some((invoice) => invoice.id === "inv_002"));
    const nudges = await store.listNudges(OWNER);
    assert.equal(
      nudges.find((nudge) => nudge.id === draft.id),
      undefined,
    );
    assert.equal(nudges.find((nudge) => nudge.id === "nudge_002")?.status, "sent");
    await assert.rejects(() => store.deleteInvoice(OWNER, "inv_001"), /No invoice with id inv_001/);
  });

  it("persists mutations through the optional snapshot writer", async () => {
    const writes: StoreSnapshot[] = [];
    const store = new MemoryDataStore(
      fixtureSnapshot({ nudges: [] }),
      (snapshot) => writes.push(snapshot),
    );
    await store.createNudgeDraft(OWNER, {
      kind: "follow_up",
      relatedId: "lead_001",
      draftText: "Ping",
    });
    assert.equal(writes.length, 1);
    assert.equal(writes[0].nudges[0]?.draftText, "Ping");
  });

  it("isolates people and invoices by Clerk user id and keeps unowned rows hidden", async () => {
    const writes: StoreSnapshot[] = [];
    const store = new MemoryDataStore(
      {
        leads: [
          {
            id: "lead_legacy",
            name: "Legacy Person",
            email: "legacy@example.com",
            status: "new",
            createdAt: "2026-01-01",
          },
        ],
        invoices: [
          {
            id: "inv_legacy",
            clientName: "Legacy Client",
            clientEmail: "legacy@example.com",
            invoiceNumber: "9",
            amountUsd: 1,
            status: "open",
            dueDate: "2026-01-01",
            createdAt: "2026-01-01",
          },
        ],
        nudges: [
          {
            id: "nudge_legacy",
            kind: "follow_up",
            relatedId: "lead_legacy",
            channel: "email",
            draftText: "Should never auto-send.",
            status: "draft",
            scheduledFor: "2026-01-01",
            createdAt: "2026-01-01",
          },
        ],
      },
      (snapshot) => writes.push(snapshot),
    );
    await assertUnownedRowsHidden(store, "lead_legacy", "inv_legacy");
    assert.deepEqual(await store.listNudges("user_a"), []);
    assert.deepEqual(await store.listNudgeOwnerIds(), []);
    await assertTenantIsolation(store);
    const latest = writes.at(-1);
    assert.ok(latest?.leads.some((lead) => lead.id === "lead_legacy" && !lead.userId));
    assert.ok(latest?.invoices.some((invoice) => invoice.id === "inv_legacy" && !invoice.userId));
    assert.ok(latest?.nudges.some((nudge) => nudge.id === "nudge_legacy" && !nudge.userId));
  });
});

describe("draft copy", () => {
  it("writes a simple follow-up and invoice reminder", () => {
    assert.equal(
      followUpDraftText(fixtureLeads[0]),
      "Hey Sam — just checking in on this: Sent website quote Monday. Happy to tweak the scope if you want. Want to hop on a quick call this week?",
    );
    assert.equal(
      invoiceDraftText(fixtureInvoices[0]),
      "Hi Sam — friendly reminder that invoice #1042 ($850) is still open. I can resend the payment link if that helps. Thanks!",
    );
  });
});

describe("record form parsing", () => {
  it("reads a lead form and rejects a bad email", () => {
    const form = new FormData();
    form.set("name", "Ava");
    form.set("email", "ava@example.com");
    form.set("status", "new");
    form.set("nextFollowUpAt", "2026-09-16");
    assert.deepEqual(leadWriteFromForm(form), {
      name: "Ava",
      email: "ava@example.com",
      company: undefined,
      status: "new",
      lastContactAt: undefined,
      nextFollowUpAt: "2026-09-16",
      notes: undefined,
    });

    const bad = new FormData();
    bad.set("name", "Ava");
    bad.set("email", "nope");
    bad.set("status", "new");
    assert.throws(() => leadWriteFromForm(bad), /email/i);
  });

  it("defaults a person to status new and omits company when those fields are absent", () => {
    const form = new FormData();
    form.set("name", "Ava");
    form.set("email", "ava@example.com");
    assert.deepEqual(leadWriteFromForm(form), {
      name: "Ava",
      email: "ava@example.com",
      company: undefined,
      status: "new",
      lastContactAt: undefined,
      nextFollowUpAt: undefined,
      notes: undefined,
    });
  });

  it("reads an invoice form and rejects a bad amount", () => {
    const form = new FormData();
    form.set("clientName", "Riley");
    form.set("clientEmail", "riley@example.com");
    form.set("invoiceNumber", "1044");
    form.set("amountUsd", "400");
    form.set("status", "open");
    form.set("dueDate", "2026-09-16");
    assert.equal(invoiceWriteFromForm(form).amountUsd, 400);

    const minimal = new FormData();
    minimal.set("clientName", "Riley");
    minimal.set("clientEmail", "riley@example.com");
    minimal.set("invoiceNumber", "1044");
    minimal.set("amountUsd", "400");
    minimal.set("dueDate", "2026-09-16");
    assert.equal(invoiceWriteFromForm(minimal).status, "open");

    const bad = new FormData();
    bad.set("clientName", "Riley");
    bad.set("clientEmail", "riley@example.com");
    bad.set("invoiceNumber", "1044");
    bad.set("amountUsd", "nope");
    bad.set("status", "open");
    bad.set("dueDate", "2026-09-16");
    assert.throws(() => invoiceWriteFromForm(bad), /Amount/);
  });
});
