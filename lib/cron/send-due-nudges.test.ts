import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_NUDGE_SEND_ATTEMPTS } from "../data/due-nudges";
import { MemoryDataStore } from "../data/memory-store";
import { fixtureInvoices, fixtureLeads } from "../data/test-fixtures";
import type { EmailClient } from "../email/send";
import { todayStamp } from "../today";
import { authorizeCronRequest, MISSING_CRON_SECRET } from "./auth";
import { sendDueNudges } from "./send-due-nudges";

const env = {
  RESEND_API_KEY: "re_test_not_a_real_key",
  RESEND_FROM_EMAIL: "Stackless <onboarding@resend.dev>",
};

function mockClient(
  result: { data: { id: string } | null; error: { message: string } | null },
  calls: unknown[] = [],
): EmailClient {
  return {
    emails: {
      async send(payload, options) {
        calls.push({ payload, options });
        return result;
      },
    },
  };
}

describe("authorizeCronRequest", () => {
  it("rejects when CRON_SECRET is missing", () => {
    const result = authorizeCronRequest(
      new Request("https://www.stackless.lol/api/cron/send-due-nudges"),
      {},
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 401);
      assert.equal(result.error, MISSING_CRON_SECRET);
    }
  });

  it("rejects a missing or wrong bearer token", () => {
    const envSecret = { CRON_SECRET: "correct-horse" };
    const url = "https://www.stackless.lol/api/cron/send-due-nudges";
    const missing = authorizeCronRequest(new Request(url), envSecret);
    assert.equal(missing.ok, false);

    const wrong = authorizeCronRequest(
      new Request(url, { headers: { authorization: "Bearer other-horse" } }),
      envSecret,
    );
    assert.equal(wrong.ok, false);
    if (!wrong.ok) assert.equal(wrong.error, "Unauthorized");
  });

  it("accepts Authorization: Bearer CRON_SECRET", () => {
    const result = authorizeCronRequest(
      new Request("https://www.stackless.lol/api/cron/send-due-nudges", {
        headers: { authorization: "Bearer correct-horse" },
      }),
      { CRON_SECRET: "correct-horse" },
    );
    assert.equal(result.ok, true);
  });
});

describe("sendDueNudges", () => {
  const now = new Date("2026-09-16T12:00:00.000Z");

  it("sends due drafts through Resend and marks them sent", async () => {
    const store = new MemoryDataStore({
      leads: fixtureLeads,
      invoices: fixtureInvoices,
      nudges: [],
    });
    const due = await store.createNudgeDraft({
      kind: "follow_up",
      relatedId: "lead_001",
      draftText: "Hey Sam — still on?",
      scheduledFor: "2026-09-16T08:00:00.000Z",
    });
    await store.createNudgeDraft({
      kind: "follow_up",
      relatedId: "lead_002",
      draftText: "Hey Jordan — later.",
      scheduledFor: "2026-09-20T08:00:00.000Z",
    });
    const calls: unknown[] = [];
    const result = await sendDueNudges(store, now, {
      env,
      client: mockClient({ data: { id: "email_ok" }, error: null }, calls),
    });
    assert.deepEqual(result.sent, [due.id]);
    assert.equal(result.failed.length, 0);
    assert.equal(calls.length, 1);
    const after = (await store.listNudges()).find((row) => row.id === due.id);
    assert.equal(after?.status, "sent");
    assert.equal((await store.getLead("lead_001"))?.lastContactAt, todayStamp());
  });

  it("does not send an already-sent nudge (no double-send)", async () => {
    const store = new MemoryDataStore({
      leads: fixtureLeads,
      invoices: fixtureInvoices,
      nudges: [],
    });
    const draft = await store.createNudgeDraft({
      kind: "invoice",
      relatedId: "inv_001",
      draftText: "Hi Sam — reminder.",
      scheduledFor: "2026-09-10",
    });
    await store.markNudgeSent(draft.id, "2026-09-10");
    const calls: unknown[] = [];
    const result = await sendDueNudges(store, now, {
      env,
      client: mockClient({ data: { id: "should-not-run" }, error: null }, calls),
    });
    assert.deepEqual(result.sent, []);
    assert.equal(calls.length, 0);
    const after = (await store.listNudges()).find((row) => row.id === draft.id);
    assert.equal(after?.status, "sent");
    assert.equal(after?.sentAt, "2026-09-10");
  });

  it("keeps a failed send as draft, records lastError, and skips after N tries", async () => {
    const store = new MemoryDataStore({
      leads: fixtureLeads,
      invoices: fixtureInvoices,
      nudges: [],
    });
    const draft = await store.createNudgeDraft({
      kind: "follow_up",
      relatedId: "lead_001",
      draftText: "Hey Sam.",
      scheduledFor: "2026-09-15",
    });
    const failing = mockClient({ data: null, error: { message: "rate limited" } });

    for (let i = 0; i < MAX_NUDGE_SEND_ATTEMPTS; i += 1) {
      const result = await sendDueNudges(store, now, { env, client: failing });
      assert.equal(result.failed[0]?.id, draft.id);
      const after = (await store.listNudges()).find((row) => row.id === draft.id);
      assert.equal(after?.status, "draft");
      assert.equal(after?.sendAttempts, i + 1);
      assert.match(after?.lastError ?? "", /rate limited/);
    }

    const calls: unknown[] = [];
    const skipped = await sendDueNudges(store, now, {
      env,
      client: mockClient({ data: { id: "email_ok" }, error: null }, calls),
    });
    assert.deepEqual(skipped.sent, []);
    assert.equal(calls.length, 0);
    assert.equal((await store.listNudges()).find((row) => row.id === draft.id)?.status, "draft");
  });
});
