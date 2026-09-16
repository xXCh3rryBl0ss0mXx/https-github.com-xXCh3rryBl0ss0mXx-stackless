import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  datetimeLocalToIso,
  formatScheduledFor,
  isoDaysFromNow,
  scheduledForFromInput,
} from "./schedule";

describe("schedule helpers", () => {
  it("keeps a date-only value and ISO-normalizes datetimes", () => {
    assert.equal(scheduledForFromInput("2026-09-18"), "2026-09-18");
    assert.equal(scheduledForFromInput("  "), undefined);
    const iso = scheduledForFromInput("2026-09-18T15:00:00.000Z");
    assert.equal(iso, "2026-09-18T15:00:00.000Z");
    assert.throws(() => scheduledForFromInput("not-a-date"), /send time/);
  });

  it("adds calendar days from now", () => {
    const now = new Date("2026-09-16T17:24:00.000Z");
    const expected = new Date(now);
    expected.setDate(expected.getDate() + 3);
    assert.equal(isoDaysFromNow(3, now), expected.toISOString());
  });

  it("formats date-only in UTC and datetimes locally", () => {
    assert.equal(formatScheduledFor("2026-09-18"), "Sep 18, 2026");
  });

  it("round-trips a datetime-local value to ISO", () => {
    const iso = datetimeLocalToIso("2026-09-18T15:00");
    assert.ok(iso);
    assert.equal(new Date(iso).toISOString(), iso);
  });
});
