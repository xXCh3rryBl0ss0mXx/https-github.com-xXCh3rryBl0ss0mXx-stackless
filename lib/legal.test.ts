import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { CONTACT_EMAIL, LEGAL_UPDATED_ON, PRIVACY_PATH, TERMS_PATH } from "./legal";

test("legal pages share the 2026-09-17 update stamp and public paths", () => {
  assert.equal(LEGAL_UPDATED_ON, "2026-09-17");
  assert.equal(TERMS_PATH, "/terms");
  assert.equal(PRIVACY_PATH, "/privacy");
  assert.equal(CONTACT_EMAIL, "hello@stackless.lol");
});

test("privacy Who helps run this lists Grok Bot with the other operators", () => {
  const privacy = readFileSync(join(process.cwd(), "app/privacy/page.tsx"), "utf8");
  const terms = readFileSync(join(process.cwd(), "app/terms/page.tsx"), "utf8");
  const helpers = privacy.split('title="Who helps run this"')[1]?.split("</LegalSection>")[0] ?? "";

  assert.match(privacy, /title="Who helps run this"/);
  assert.ok(helpers.includes("<li>Clerk — accounts and waitlist</li>"));
  assert.ok(helpers.includes("<li>Stripe — payments and the Customer Portal</li>"));
  assert.ok(helpers.includes("<li>Resend — outbound email</li>"));
  assert.ok(helpers.includes("<li>Neon — Postgres, the production store</li>"));
  assert.ok(helpers.includes("<li>Vercel — hosting</li>"));
  assert.ok(helpers.includes("<li>Grok Bot — helps build and run Stackless</li>"));
  assert.equal(
    helpers.match(/<li>Grok Bot[^<]*<\/li>/)?.[0],
    "<li>Grok Bot — helps build and run Stackless</li>",
  );
  assert.doesNotMatch(
    helpers.match(/<li>Grok Bot[^<]*<\/li>/)?.[0] ?? "",
    /payment|Stripe|email|customer/i,
  );
  assert.doesNotMatch(terms, /Who helps run this/);
  assert.doesNotMatch(terms, /Grok Bot/);
});

test("privacy deletion asks the team, not Michael by name", () => {
  const privacy = readFileSync(join(process.cwd(), "app/privacy/page.tsx"), "utf8");
  const deletion = privacy.split('title="Deletion"')[1]?.split("</LegalSection>")[0] ?? "";

  assert.ok(deletion.includes("our team will handle it"));
  assert.doesNotMatch(deletion, /Michael/);
  assert.ok(deletion.includes("Stripe may keep billing records"));
});
