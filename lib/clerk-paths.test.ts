import assert from "node:assert/strict";
import { test } from "node:test";
import { CLERK_USER_PROFILE_PATH, peachSignInUrl } from "./clerk-paths";

test("peachSignInUrl stays on the app Sign In page, not Clerk Account Portal", () => {
  const url = peachSignInUrl("https://example.com/app");
  assert.equal(url.startsWith("/sign-in?"), true);
  assert.equal(url.includes("accounts.dev"), false);
  assert.equal(url.includes("redirect_url="), true);
  assert.equal(decodeURIComponent(url.split("redirect_url=")[1] ?? ""), "https://example.com/app");
});

test("account profile is an in-app path, and unsigned visits return via peach Sign In", () => {
  assert.equal(CLERK_USER_PROFILE_PATH, "/account");
  const url = peachSignInUrl("/account");
  assert.equal(url, "/sign-in?redirect_url=%2Faccount");
  assert.equal(url.includes("accounts.dev"), false);
});
