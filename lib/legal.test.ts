import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTACT_EMAIL, LEGAL_UPDATED_ON, PRIVACY_PATH, TERMS_PATH } from "./legal";

test("legal pages share the 2026-09-17 update stamp and public paths", () => {
  assert.equal(LEGAL_UPDATED_ON, "2026-09-17");
  assert.equal(TERMS_PATH, "/terms");
  assert.equal(PRIVACY_PATH, "/privacy");
  assert.equal(CONTACT_EMAIL, "hello@stackless.lol");
});
