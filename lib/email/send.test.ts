import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MemoryDataStore } from "../data/memory-store";
import { FIXTURE_USER_ID, fixtureInvoices, fixtureLeads } from "../data/test-fixtures";
import { MISSING_API_KEY, MISSING_FROM_EMAIL, readResendConfig } from "./config";
import { deliverNudgeDraft, nudgeIdempotencyKey } from "./deliver";
import { sendNudgeEmail, type EmailClient } from "./send";
import { nudgeEmailHtml, nudgeEmailText, nudgeSubject } from "./templates";

const OWNER = FIXTURE_USER_ID;

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

describe("readResendConfig", () => {
  it("asks for RESEND_API_KEY when it is missing", () => {
    const result = readResendConfig({ RESEND_FROM_EMAIL: "Stackless <me@example.com>" });
    assert.deepEqual(result, { ok: false, error: MISSING_API_KEY });
  });

  it("asks for RESEND_FROM_EMAIL when the key is set but from is not", () => {
    const result = readResendConfig({ RESEND_API_KEY: "re_test" });
    assert.deepEqual(result, { ok: false, error: MISSING_FROM_EMAIL });
  });

  it("returns the key and from address when both are set", () => {
    assert.deepEqual(readResendConfig(env), {
      ok: true,
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
    });
  });
});

describe("nudge templates", () => {
  it("uses a soft subject per kind", () => {
    assert.equal(nudgeSubject("follow_up"), "Quick check-in");
    assert.equal(nudgeSubject("invoice"), "Invoice reminder");
  });

  it("puts the draft in both text and HTML, and escapes HTML in the body", () => {
    const draft = "Hey Sam — still on?\n\n<script>alert(1)</script>";
    assert.equal(nudgeEmailText(draft), draft);
    const html = nudgeEmailHtml("follow_up", draft);
    assert.match(html, /Hey Sam — still on\?/);
    assert.match(html, /Follow-up/);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(nudgeEmailHtml("invoice", "Hi"), /Invoice/);
  });
});

describe("sendNudgeEmail", () => {
  it("fails clearly when the API key is missing, without calling Resend", async () => {
    const calls: unknown[] = [];
    const result = await sendNudgeEmail(
      { kind: "follow_up", to: "sam@example.com", draftText: "Hi" },
      { env: {}, client: mockClient({ data: { id: "should-not-run" }, error: null }, calls) },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, MISSING_API_KEY);
    assert.equal(calls.length, 0);
  });

  it("sends HTML + text to Resend and returns the id", async () => {
    const calls: unknown[] = [];
    const result = await sendNudgeEmail(
      {
        kind: "invoice",
        to: "sam@example.com",
        draftText: "Hi Sam — invoice #1042 is still open.",
        idempotencyKey: "nudge/nudge_001",
      },
      {
        env,
        client: mockClient({ data: { id: "email_123" }, error: null }, calls),
      },
    );
    assert.deepEqual(result, { ok: true, id: "email_123" });
    const first = calls[0] as {
      payload: { to: string; subject: string; from: string; html: string; text: string };
      options: { idempotencyKey: string };
    };
    assert.equal(first.payload.to, "sam@example.com");
    assert.equal(first.payload.from, env.RESEND_FROM_EMAIL);
    assert.equal(first.payload.subject, "Invoice reminder");
    assert.equal(first.payload.text, "Hi Sam — invoice #1042 is still open.");
    assert.match(first.payload.html, /invoice #1042/);
    assert.equal(first.options.idempotencyKey, "nudge/nudge_001");
  });

  it("surfaces a Resend error instead of pretending it sent", async () => {
    const result = await sendNudgeEmail(
      { kind: "follow_up", to: "sam@example.com", draftText: "Hi" },
      {
        env,
        client: mockClient({ data: null, error: { message: "domain not verified" } }),
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "Email didn’t send: domain not verified");
  });
});

describe("nudgeIdempotencyKey", () => {
  it("is stable for the same to, subject, and draft", () => {
    const a = nudgeIdempotencyKey("nudge_1", "sam@example.com", "Quick check-in", "Hey");
    const b = nudgeIdempotencyKey("nudge_1", "sam@example.com", "Quick check-in", "Hey");
    assert.equal(a, b);
    assert.match(a, /^nudge\/nudge_1\/[0-9a-f]{16}$/);
  });

  it("trims to and draft so whitespace-only edits share a key with the Resend body", () => {
    const trimmed = nudgeIdempotencyKey(
      "nudge_1",
      "sam@example.com",
      "Quick check-in",
      "Hey",
    );
    const padded = nudgeIdempotencyKey(
      "nudge_1",
      "  sam@example.com  ",
      "Quick check-in",
      "  Hey  ",
    );
    assert.equal(trimmed, padded);
  });

  it("changes when the draft, recipient, or subject changes", () => {
    const base = nudgeIdempotencyKey("nudge_1", "sam@example.com", "Quick check-in", "Hey");
    assert.notEqual(
      base,
      nudgeIdempotencyKey("nudge_1", "sam@example.com", "Quick check-in", "Hey edited"),
    );
    assert.notEqual(
      base,
      nudgeIdempotencyKey("nudge_1", "other@example.com", "Quick check-in", "Hey"),
    );
    assert.notEqual(
      base,
      nudgeIdempotencyKey("nudge_1", "sam@example.com", "Invoice reminder", "Hey"),
    );
    assert.notEqual(
      base,
      nudgeIdempotencyKey("nudge_2", "sam@example.com", "Quick check-in", "Hey"),
    );
  });
});

describe("deliverNudgeDraft", () => {
  function storeWithDraft() {
    return new MemoryDataStore({
      leads: fixtureLeads,
      invoices: fixtureInvoices,
      nudges: [],
    });
  }

  it("marks the nudge sent only after Resend succeeds", async () => {
    const store = storeWithDraft();
    const draft = await store.createNudgeDraft(OWNER, {
      kind: "follow_up",
      relatedId: "lead_001",
      draftText: "Hey Sam — just checking in.",
    });
    const result = await deliverNudgeDraft(store, OWNER, draft, "2026-09-15", {
      env,
      client: mockClient({ data: { id: "email_ok" }, error: null }),
    });
    assert.equal(result.ok, true);
    const after = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    assert.equal(after?.status, "sent");
    assert.equal(after?.sentAt, "2026-09-15");
    assert.equal((await store.getLead(OWNER, "lead_001"))?.lastContactAt, "2026-09-15");
  });

  it("keeps the draft when Resend fails", async () => {
    const store = storeWithDraft();
    const draft = await store.createNudgeDraft(OWNER, {
      kind: "invoice",
      relatedId: "inv_001",
      draftText: "Hi Sam — reminder.",
    });
    const result = await deliverNudgeDraft(store, OWNER, draft, "2026-09-15", {
      env,
      client: mockClient({ data: null, error: { message: "rate limited" } }),
    });
    assert.equal(result.ok, false);
    const after = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    assert.equal(after?.status, "draft");
    assert.equal(after?.sentAt, undefined);
    assert.equal((await store.getInvoice(OWNER, "inv_001"))?.lastNudgedAt, "2026-09-10");
  });

  it("keeps the draft when the API key is missing", async () => {
    const store = storeWithDraft();
    const draft = await store.createNudgeDraft(OWNER, {
      kind: "follow_up",
      relatedId: "lead_002",
      draftText: "Hey Jordan.",
    });
    const result = await deliverNudgeDraft(store, OWNER, draft, "2026-09-15", { env: {} });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, MISSING_API_KEY);
    const after = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    assert.equal(after?.status, "draft");
  });

  it("keys Resend idempotency on payload so an edited draft can send after a prior attempt", async () => {
    const store = storeWithDraft();
    const draft = await store.createNudgeDraft(OWNER, {
      kind: "follow_up",
      relatedId: "lead_001",
      draftText: "Hey Sam — first try.",
    });
    const firstCalls: unknown[] = [];
    const first = await deliverNudgeDraft(store, OWNER, draft, "2026-09-15", {
      env,
      client: mockClient({ data: null, error: { message: "rate limited" } }, firstCalls),
    });
    assert.equal(first.ok, false);
    const afterFail = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    assert.equal(afterFail?.status, "draft");

    const edited = await store.updateNudgeDraft(OWNER, draft.id, {
      draftText: "Hey Sam — rewritten.",
    });
    const secondCalls: unknown[] = [];
    const second = await deliverNudgeDraft(store, OWNER, edited, "2026-09-15", {
      env,
      client: mockClient({ data: { id: "email_ok" }, error: null }, secondCalls),
    });
    assert.equal(second.ok, true);

    const firstKey = (firstCalls[0] as { options: { idempotencyKey: string } }).options
      .idempotencyKey;
    const secondKey = (secondCalls[0] as { options: { idempotencyKey: string } }).options
      .idempotencyKey;
    assert.notEqual(firstKey, secondKey);
    assert.equal(
      secondKey,
      nudgeIdempotencyKey(draft.id, "sam@example.com", "Quick check-in", edited.draftText),
    );

    const after = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    assert.equal(after?.status, "sent");
    assert.equal(after?.sentAt, "2026-09-15");
  });

  it("reuses the same idempotency key for an identical retry (double-click / cron)", async () => {
    const store = storeWithDraft();
    const draft = await store.createNudgeDraft(OWNER, {
      kind: "invoice",
      relatedId: "inv_001",
      draftText: "Hi Sam — reminder.",
    });
    const calls: unknown[] = [];
    const failing = mockClient({ data: null, error: { message: "rate limited" } }, calls);
    await deliverNudgeDraft(store, OWNER, draft, "2026-09-15", { env, client: failing });
    const stillDraft = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    await deliverNudgeDraft(store, OWNER, stillDraft!, "2026-09-15", { env, client: failing });
    assert.equal(calls.length, 2);
    const keys = calls.map(
      (call) => (call as { options: { idempotencyKey: string } }).options.idempotencyKey,
    );
    assert.equal(keys[0], keys[1]);
    assert.equal(
      keys[0],
      nudgeIdempotencyKey(draft.id, "sam@example.com", "Invoice reminder", draft.draftText),
    );
    const after = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    assert.equal(after?.status, "draft");
  });

  it("does not call Resend again when the nudge is already sent", async () => {
    const store = storeWithDraft();
    const draft = await store.createNudgeDraft(OWNER, {
      kind: "follow_up",
      relatedId: "lead_001",
      draftText: "Hey Sam.",
    });
    await store.markNudgeSent(OWNER, draft.id, "2026-09-15");
    const sent = (await store.listNudges(OWNER)).find((row) => row.id === draft.id);
    const calls: unknown[] = [];
    const result = await deliverNudgeDraft(store, OWNER, sent!, "2026-09-16", {
      env,
      client: mockClient({ data: { id: "should-not-run" }, error: null }, calls),
    });
    assert.deepEqual(result, { ok: true, id: "already-sent" });
    assert.equal(calls.length, 0);
  });
});
