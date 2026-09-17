import assert from "node:assert/strict";
import { test } from "node:test";
import { clerkAppearance, clerkUserButtonAppearance } from "./clerk";

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
