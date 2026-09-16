import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MISSING_PRICE_ID, MISSING_SECRET_KEY } from "./config";
import {
  billingStateFromInput,
  billingStateFromUser,
  isActiveSubscriptionStatus,
  stripeCustomerIdFromMetadata,
  subscriptionStatusFromMetadata,
} from "./subscription";

describe("isActiveSubscriptionStatus", () => {
  it("grants access for active, trialing, and past_due", () => {
    assert.equal(isActiveSubscriptionStatus("active"), true);
    assert.equal(isActiveSubscriptionStatus("trialing"), true);
    assert.equal(isActiveSubscriptionStatus("past_due"), true);
    assert.equal(isActiveSubscriptionStatus(" ACTIVE "), true);
  });

  it("denies canceled, unpaid, incomplete, and missing", () => {
    assert.equal(isActiveSubscriptionStatus("canceled"), false);
    assert.equal(isActiveSubscriptionStatus("unpaid"), false);
    assert.equal(isActiveSubscriptionStatus("incomplete"), false);
    assert.equal(isActiveSubscriptionStatus("paused"), false);
    assert.equal(isActiveSubscriptionStatus(undefined), false);
    assert.equal(isActiveSubscriptionStatus(""), false);
  });
});

describe("billingStateFromInput", () => {
  it("keeps /app open when Clerk is not configured (local/CI)", () => {
    const state = billingStateFromInput({
      clerkConfigured: false,
      signedIn: false,
      stripeReady: false,
      stripeSetupMessage: MISSING_SECRET_KEY,
    });
    assert.equal(state.kind, "open");
    assert.equal(state.canCheckout, false);
  });

  it("shows a setup paywall when Clerk is on but Stripe is not", () => {
    const state = billingStateFromInput({
      clerkConfigured: true,
      signedIn: true,
      stripeReady: false,
      stripeSetupMessage: MISSING_PRICE_ID,
    });
    assert.equal(state.kind, "setup");
    assert.equal(state.canCheckout, false);
    assert.equal(state.message, MISSING_PRICE_ID);
  });

  it("shows Subscribe when signed in without an active sub", () => {
    const state = billingStateFromInput({
      clerkConfigured: true,
      signedIn: true,
      stripeReady: true,
      stripeSetupMessage: "",
      subscriptionStatus: "canceled",
      stripeCustomerId: "cus_123",
    });
    assert.equal(state.kind, "inactive");
    assert.equal(state.canCheckout, true);
    assert.equal(state.canManageBilling, true);
  });

  it("treats an active sub as paid access", () => {
    const state = billingStateFromInput({
      clerkConfigured: true,
      signedIn: true,
      stripeReady: true,
      stripeSetupMessage: "",
      subscriptionStatus: "active",
      stripeCustomerId: "cus_123",
    });
    assert.equal(state.kind, "active");
    assert.equal(state.canManageBilling, true);
    assert.equal(state.canCheckout, false);
  });
});

describe("billingStateFromUser", () => {
  it("reads customer id from privateMetadata first", () => {
    const user = {
      publicMetadata: { stripeCustomerId: "cus_public", subscriptionStatus: "active" },
      privateMetadata: { stripeCustomerId: "cus_private" },
    };
    assert.equal(stripeCustomerIdFromMetadata(user), "cus_private");
    assert.equal(subscriptionStatusFromMetadata(user), "active");
    const state = billingStateFromUser(user, {
      clerkConfigured: true,
      env: { STRIPE_SECRET_KEY: "sk_test", STRIPE_PRICE_ID: "price_1" },
    });
    assert.equal(state.kind, "active");
    assert.equal(state.stripeCustomerId, "cus_private");
  });
});
