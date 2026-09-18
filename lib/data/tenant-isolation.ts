import assert from "node:assert/strict";
import type { DataStore, InvoiceWrite, LeadWrite } from "./types";

const USER_A = "user_a";
const USER_B = "user_b";

const leadWrite: LeadWrite = {
  name: "Ada Owner",
  email: "ada@example.com",
  status: "new",
  nextFollowUpAt: "2026-09-16",
};

const invoiceWrite: InvoiceWrite = {
  clientName: "Ada Client",
  clientEmail: "ada-client@example.com",
  invoiceNumber: "2001",
  amountUsd: 250,
  status: "open",
  dueDate: "2026-09-01",
};

const otherLeadWrite: LeadWrite = {
  name: "Bea Other",
  email: "bea@example.com",
  status: "new",
};

const otherInvoiceWrite: InvoiceWrite = {
  clientName: "Bea Client",
  clientEmail: "bea-client@example.com",
  invoiceNumber: "2002",
  amountUsd: 80,
  status: "open",
  dueDate: "2026-09-01",
};

/** User A cannot read, update, or delete user B's person or invoice, and vice versa. */
export async function assertTenantIsolation(store: DataStore): Promise<void> {
  const personA = await store.createLead(USER_A, leadWrite);
  const invoiceA = await store.createInvoice(USER_A, invoiceWrite);
  const personB = await store.createLead(USER_B, otherLeadWrite);
  const invoiceB = await store.createInvoice(USER_B, otherInvoiceWrite);

  assert.equal(personA.userId, USER_A);
  assert.equal(invoiceA.userId, USER_A);
  assert.equal(personB.userId, USER_B);

  assert.deepEqual(
    (await store.listLeads(USER_A)).map((lead) => lead.id),
    [personA.id],
  );
  assert.deepEqual(
    (await store.listLeads(USER_B)).map((lead) => lead.id),
    [personB.id],
  );
  assert.deepEqual(
    (await store.listInvoices(USER_A)).map((invoice) => invoice.id),
    [invoiceA.id],
  );
  assert.deepEqual(
    (await store.listInvoices(USER_B)).map((invoice) => invoice.id),
    [invoiceB.id],
  );

  assert.equal(await store.getLead(USER_B, personA.id), null);
  assert.equal(await store.getInvoice(USER_B, invoiceA.id), null);
  assert.equal(await store.getLead(USER_A, personB.id), null);
  assert.equal(await store.getInvoice(USER_A, invoiceB.id), null);

  await assert.rejects(
    () => store.updateLead(USER_B, personA.id, { ...leadWrite, name: "Hijacked" }),
    /No lead with id/,
  );
  await assert.rejects(() => store.deleteLead(USER_B, personA.id), /No lead with id/);
  await assert.rejects(
    () => store.updateInvoice(USER_B, invoiceA.id, { ...invoiceWrite, status: "paid" }),
    /No invoice with id/,
  );
  await assert.rejects(() => store.deleteInvoice(USER_B, invoiceA.id), /No invoice with id/);

  assert.equal((await store.getLead(USER_A, personA.id))?.name, "Ada Owner");
  assert.equal((await store.getInvoice(USER_A, invoiceA.id))?.status, "open");

  await assert.rejects(
    () =>
      store.createNudgeDraft(USER_B, {
        kind: "follow_up",
        relatedId: personA.id,
        draftText: "Should not attach to someone else's person.",
      }),
    /No lead with id/,
  );
}

export async function assertUnownedRowsHidden(
  store: DataStore,
  unownedLeadId: string,
  unownedInvoiceId: string,
): Promise<void> {
  assert.equal(await store.getLead(USER_A, unownedLeadId), null);
  assert.equal(await store.getLead(USER_B, unownedLeadId), null);
  assert.equal(await store.getInvoice(USER_A, unownedInvoiceId), null);
  assert.equal(await store.getInvoice(USER_B, unownedInvoiceId), null);
  assert.equal(
    (await store.listLeads(USER_A)).some((lead) => lead.id === unownedLeadId),
    false,
  );
  assert.equal(
    (await store.listLeads(USER_B)).some((lead) => lead.id === unownedLeadId),
    false,
  );
  assert.equal(
    (await store.listInvoices(USER_A)).some((invoice) => invoice.id === unownedInvoiceId),
    false,
  );
  await assert.rejects(() => store.deleteLead(USER_A, unownedLeadId), /No lead with id/);
  await assert.rejects(() => store.deleteInvoice(USER_B, unownedInvoiceId), /No invoice with id/);
}
