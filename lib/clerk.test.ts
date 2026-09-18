import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { clerkAppearance, clerkUserButtonAppearance, clerkUserProfileAppearance } from "./clerk";
import { PRIVACY_PATH, TERMS_PATH } from "./legal";

test("UserButton popover is a solid white card with the Clerk footer hidden", () => {
  const { elements } = clerkUserButtonAppearance;
  assert.equal(elements.userButtonPopoverCard.background, "#ffffff");
  assert.equal(elements.userButtonPopoverCard.overflow, "hidden");
  assert.equal(elements.userButtonPopoverMain.background, "#ffffff !important");
  assert.equal(elements.userButtonPopoverMain.borderRadius, "0");
  assert.equal(elements.userButtonPopoverFooter.display, "none");
  assert.equal(elements.rootBox.width, "auto");
});

test("global Clerk appearance includes the same UserButton popover overrides", () => {
  assert.equal(clerkAppearance.elements.userButtonPopoverFooter.display, "none");
  assert.equal(clerkAppearance.elements.userButtonPopoverCard.background, "#ffffff");
  assert.equal(clerkAppearance.elements.userButtonPopoverMain.borderRadius, "0");
});

test("Clerk appearance points at the public Terms and Privacy pages", () => {
  assert.equal(clerkAppearance.layout.termsPageUrl, TERMS_PATH);
  assert.equal(clerkAppearance.layout.privacyPageUrl, PRIVACY_PATH);
});

test("UserProfile appearance stays the peach navbar, not a restyle of Profile or Security", () => {
  assert.equal(clerkUserProfileAppearance.elements.navbar.background, "#fff8f0");
  assert.equal(clerkUserProfileAppearance.elements.navbar.borderColor, "#f0e2d4");
  assert.equal(clerkUserProfileAppearance.elements.navbarButton.color, "#2b2118");
  assert.equal(clerkUserProfileAppearance.elements.scrollBox.background, "#ffffff");
  assert.equal(clerkUserProfileAppearance.layout.termsPageUrl, TERMS_PATH);
  assert.equal(clerkUserProfileAppearance.layout.privacyPageUrl, PRIVACY_PATH);
});

test("Manage account UserProfile mounts Terms and Privacy as custom pages", () => {
  const profile = readFileSync(join(process.cwd(), "components", "stackless-user-profile.tsx"), "utf8");
  const account = readFileSync(
    join(process.cwd(), "app", "account", "[[...user-profile]]", "page.tsx"),
    "utf8",
  );

  assert.match(profile, /<UserProfile\.Page[\s\S]*label="Terms"/);
  assert.match(profile, /url=\{CLERK_USER_PROFILE_TERMS_URL\}/);
  assert.match(profile, /<UserProfile\.Page[\s\S]*label="Privacy"/);
  assert.match(profile, /url=\{CLERK_USER_PROFILE_PRIVACY_URL\}/);
  assert.match(profile, /<TermsDocument variant="embedded" \/>/);
  assert.match(profile, /<PrivacyDocument variant="embedded" \/>/);
  assert.doesNotMatch(profile, /UserProfile\.Link/);
  assert.match(account, /<StacklessUserProfile \/>/);
  assert.doesNotMatch(account, /<UserProfile/);

  const userButton = readFileSync(
    join(process.cwd(), "components", "stackless-user-button.tsx"),
    "utf8",
  );
  assert.match(userButton, /userProfileMode="navigation"/);
  assert.doesNotMatch(userButton, /UserButton\.UserProfilePage/);
});
