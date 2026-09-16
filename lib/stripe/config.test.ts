import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MISSING_PRICE_ID,
  MISSING_SECRET_KEY,
  MISSING_WEBHOOK_SECRET,
  isStripeCheckoutConfigured,
  isStripePublishableConfigured,
  readStripeCheckoutConfig,
  readStripeSecretKey,
  readStripeWebhookConfig,
} from "./config";

const filled = {
  STRIPE_SECRET_KEY: "sk_test_not_real",
  STRIPE_PRICE_ID: "price_not_real",
  STRIPE_WEBHOOK_SECRET: "whsec_not_real",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_not_real",
};

describe("readStripeSecretKey", () => {
  it("asks for STRIPE_SECRET_KEY when it is missing", () => {
    assert.deepEqual(readStripeSecretKey({}), { ok: false, error: MISSING_SECRET_KEY });
  });

  it("returns the key when set", () => {
    assert.deepEqual(readStripeSecretKey(filled), {
      ok: true,
      secretKey: filled.STRIPE_SECRET_KEY,
    });
  });
});

describe("readStripeCheckoutConfig", () => {
  it("asks for the secret first", () => {
    assert.deepEqual(readStripeCheckoutConfig({ STRIPE_PRICE_ID: "price_1" }), {
      ok: false,
      error: MISSING_SECRET_KEY,
    });
  });

  it("asks for STRIPE_PRICE_ID when the secret is set", () => {
    assert.deepEqual(readStripeCheckoutConfig({ STRIPE_SECRET_KEY: "sk_test" }), {
      ok: false,
      error: MISSING_PRICE_ID,
    });
  });

  it("returns secret + price when both are set", () => {
    assert.deepEqual(readStripeCheckoutConfig(filled), {
      ok: true,
      secretKey: filled.STRIPE_SECRET_KEY,
      priceId: filled.STRIPE_PRICE_ID,
    });
  });

  it("isStripeCheckoutConfigured is false without keys so the app can still build", () => {
    assert.equal(isStripeCheckoutConfigured({}), false);
    assert.equal(isStripeCheckoutConfigured(filled), true);
  });
});

describe("readStripeWebhookConfig", () => {
  it("asks for the webhook secret after the API key", () => {
    assert.deepEqual(readStripeWebhookConfig({ STRIPE_SECRET_KEY: "sk_test" }), {
      ok: false,
      error: MISSING_WEBHOOK_SECRET,
    });
  });

  it("returns both secrets when set", () => {
    assert.deepEqual(readStripeWebhookConfig(filled), {
      ok: true,
      secretKey: filled.STRIPE_SECRET_KEY,
      webhookSecret: filled.STRIPE_WEBHOOK_SECRET,
    });
  });
});

describe("isStripePublishableConfigured", () => {
  it("requires a pk_ key", () => {
    assert.equal(isStripePublishableConfigured({}), false);
    assert.equal(
      isStripePublishableConfigured({ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "sk_test" }),
      false,
    );
    assert.equal(isStripePublishableConfigured(filled), true);
  });
});
