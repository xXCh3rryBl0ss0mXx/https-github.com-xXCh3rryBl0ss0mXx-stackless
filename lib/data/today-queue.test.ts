import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fixtureInvoices, fixtureLeads, fixtureNudges } from "./test-fixtures";
import {
  buildTodayQueue,
  restOfRecords,
  splitRecentNudges,
  stillOnTodayList,
} from "./today-queue";

describe("stillOnTodayList", () => {
  it("keeps records with no nudge, drops skips and same-day sends", () => {
    assert.equal(stillOnTodayList([], "lead_new", "2026-09-16"), true);
    assert.equal(stillOnTodayList(fixtureNudges, "lead_001", "2026-09-16"), true);
    assert.equal(stillOnTodayList(fixtureNudges, "inv_001", "2026-09-10"), false);
    assert.equal(stillOnTodayList(fixtureNudges, "inv_001", "2026-09-16"), true);
    assert.equal(
      stillOnTodayList(
        [{ ...fixtureNudges[0], status: "skipped", relatedId: "lead_001" }],
        "lead_001",
        "2026-09-16",
      ),
      false,
    );
  });
});

describe("buildTodayQueue", () => {
  it("mixes due follow-ups and overdue invoices, oldest date first", () => {
    const queue = buildTodayQueue(fixtureLeads, fixtureInvoices, fixtureNudges, "2026-09-16");
    assert.deepEqual(
      queue.map((item) => item.id),
      ["lead_002", "inv_001", "lead_001"],
    );
    assert.equal(queue[1]?.kind, "invoice");
    const follow = queue.find((item) => item.id === "lead_001");
    assert.equal(follow?.kind, "follow_up");
    assert.equal(follow && follow.kind === "follow_up" ? follow.draft?.id : undefined, "nudge_001");
  });

  it("omits a person after they were skipped", () => {
    const skipped = fixtureNudges.map((nudge) =>
      nudge.id === "nudge_001" ? { ...nudge, status: "skipped" as const } : nudge,
    );
    const queue = buildTodayQueue(fixtureLeads, [], skipped, "2026-09-16");
    assert.deepEqual(
      queue.map((item) => item.id),
      ["lead_002"],
    );
  });
});

describe("restOfRecords", () => {
  it("hides people and invoices already on Due today", () => {
    const rest = restOfRecords(
      fixtureLeads,
      fixtureInvoices,
      new Set(["lead_001", "inv_001"]),
    );
    assert.deepEqual(
      rest.map((item) => item.id),
      ["lead_002", "inv_002"],
    );
  });
});

describe("splitRecentNudges", () => {
  it("keeps stray drafts off the due queue and treats sent/skipped as history", () => {
    const { strayDrafts, history } = splitRecentNudges(
      fixtureNudges,
      new Set(["lead_001"]),
    );
    assert.equal(strayDrafts.length, 0);
    assert.deepEqual(
      history.map((nudge) => nudge.id),
      ["nudge_002"],
    );

    const stray = splitRecentNudges(fixtureNudges, new Set()).strayDrafts;
    assert.deepEqual(
      stray.map((nudge) => nudge.id),
      ["nudge_001"],
    );
  });
});
