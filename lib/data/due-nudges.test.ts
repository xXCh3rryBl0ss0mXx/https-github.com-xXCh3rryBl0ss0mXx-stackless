import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dueNudgeDrafts, isDueNudgeDraft, MAX_NUDGE_SEND_ATTEMPTS } from "./due-nudges";
import { fixtureNudges } from "./test-fixtures";
import type { Nudge } from "./types";

const now = new Date("2026-09-16T12:00:00.000Z");

function nudge(overrides: Partial<Nudge>): Nudge {
  return {
    ...fixtureNudges[0],
    ...overrides,
  };
}

describe("dueNudgeDrafts", () => {
  it("selects draft nudges whose scheduledFor is now or past", () => {
    const due = dueNudgeDrafts(
      [
        nudge({ id: "nudge_due_date", scheduledFor: "2026-09-16" }),
        nudge({ id: "nudge_due_iso", scheduledFor: "2026-09-16T11:00:00.000Z" }),
        nudge({ id: "nudge_future", scheduledFor: "2026-09-16T18:00:00.000Z" }),
      ],
      now,
    );
    assert.deepEqual(
      due.map((row) => row.id),
      ["nudge_due_date", "nudge_due_iso"],
    );
  });

  it("never selects sent or skipped nudges, even if scheduledFor is past", () => {
    const due = dueNudgeDrafts(
      [
        nudge({ id: "nudge_sent", status: "sent", scheduledFor: "2026-09-10", sentAt: "2026-09-10" }),
        nudge({ id: "nudge_skipped", status: "skipped", scheduledFor: "2026-09-10" }),
        nudge({ id: "nudge_draft", status: "draft", scheduledFor: "2026-09-10" }),
      ],
      now,
    );
    assert.deepEqual(
      due.map((row) => row.id),
      ["nudge_draft"],
    );
  });

  it("skips drafts with no scheduledFor", () => {
    const row = nudge({ id: "nudge_unscheduled", scheduledFor: undefined });
    assert.equal(isDueNudgeDraft(row, now), false);
    assert.deepEqual(dueNudgeDrafts([row], now), []);
  });

  it("stops selecting a draft after MAX_NUDGE_SEND_ATTEMPTS failures", () => {
    const exhausted = nudge({
      id: "nudge_stuck",
      scheduledFor: "2026-09-10",
      sendAttempts: MAX_NUDGE_SEND_ATTEMPTS,
      lastError: "Email didn’t send: rate limited",
    });
    const retrying = nudge({
      id: "nudge_retry",
      scheduledFor: "2026-09-10",
      sendAttempts: MAX_NUDGE_SEND_ATTEMPTS - 1,
    });
    assert.equal(isDueNudgeDraft(exhausted, now), false);
    assert.equal(isDueNudgeDraft(retrying, now), true);
  });
});
