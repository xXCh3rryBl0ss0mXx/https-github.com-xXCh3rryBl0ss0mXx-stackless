import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WAITLIST_NEEDS_DATABASE,
  assertWaitlistCanPersist,
  parseWaitlistEmail,
} from "./waitlist";

describe("waitlist email", () => {
  it("normalizes case and whitespace", () => {
    assert.equal(parseWaitlistEmail("  Alex@Studio.com "), "alex@studio.com");
  });

  it("rejects values that are not an email", () => {
    assert.throws(() => parseWaitlistEmail(""), /email/i);
    assert.throws(() => parseWaitlistEmail("nope"), /email/i);
    assert.throws(() => parseWaitlistEmail("@studio.com"), /email/i);
    assert.throws(() => parseWaitlistEmail("alex@"), /email/i);
    assert.throws(() => parseWaitlistEmail("alex @studio.com"), /email/i);
  });
});

describe("waitlist persistence guard", () => {
  it("allows neon so a public signup can survive a new instance", () => {
    assert.doesNotThrow(() => assertWaitlistCanPersist("neon"));
  });

  it("refuses memory and sheets instead of claiming the email was saved", () => {
    assert.throws(() => assertWaitlistCanPersist("memory"), {
      message: WAITLIST_NEEDS_DATABASE,
    });
    assert.throws(() => assertWaitlistCanPersist("sheets"), {
      message: WAITLIST_NEEDS_DATABASE,
    });
  });
});
