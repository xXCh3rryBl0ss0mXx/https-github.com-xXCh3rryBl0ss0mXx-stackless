import assert from "node:assert/strict";
import { test } from "node:test";
import { peachSignInUrl } from "./clerk-paths";

test("peachSignInUrl stays on the app Sign In page, not Clerk Account Portal", () => {
  const url = peachSignInUrl("https://example.com/app");
  assert.equal(url.startsWith("/sign-in?"), true);
  assert.equal(url.includes("accounts.dev"), false);
  assert.equal(url.includes("redirect_url="), true);
  assert.equal(decodeURIComponent(url.split("redirect_url=")[1] ?? ""), "https://example.com/app");
});
