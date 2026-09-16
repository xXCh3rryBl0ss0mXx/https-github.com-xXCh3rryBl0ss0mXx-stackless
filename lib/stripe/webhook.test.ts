import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BillingPatch } from "./subscription";
import {
  applyCheckoutSession,
  applyStripeEvent,
  clerkUserIdFromRecord,
  idFromExpandable,
} from "./webhook";

function memoryWriter() {
  const writes: { userId: string; patch: BillingPatch }[] = [];
  return {
    writes,
    users: {
      async updateUserBilling(userId: string, patch: BillingPatch) {
        writes.push({ userId, patch });
      },
    },
  };
}

describe("id helpers", () => {
  it("reads ids from strings or expanded objects", () => {
    assert.equal(idFromExpandable("cus_1"), "cus_1");
    assert.equal(idFromExpandable({ id: "sub_1" }), "sub_1");
    assert.equal(idFromExpandable(null), undefined);
  });

  it("prefers client_reference_id then metadata.clerkUserId", () => {
    assert.equal(
      clerkUserIdFromRecord({ client_reference_id: "user_1", metadata: { clerkUserId: "user_2" } }),
      "user_1",
    );
    assert.equal(
      clerkUserIdFromRecord({ client_reference_id: null, metadata: { clerkUserId: "user_2" } }),
      "user_2",
    );
  });
});

describe("applyCheckoutSession", () => {
  it("stores active status and Stripe ids on the Clerk user", async () => {
    const { writes, users } = memoryWriter();
    const result = await applyCheckoutSession(
      {
        status: "complete",
        client_reference_id: "user_abc",
        customer: "cus_abc",
        subscription: "sub_abc",
        metadata: { clerkUserId: "user_abc" },
      },
      {
        users,
        stripe: {
          async retrieveSubscription(id) {
            assert.equal(id, "sub_abc");
            return { id, status: "active", customer: "cus_abc", metadata: { clerkUserId: "user_abc" } };
          },
        },
      },
    );
    assert.equal(result.ok, true);
    if (!result.ok || result.action !== "updated") throw new Error("expected update");
    assert.equal(result.userId, "user_abc");
    assert.deepEqual(result.patch, {
      stripeCustomerId: "cus_abc",
      stripeSubscriptionId: "sub_abc",
      subscriptionStatus: "active",
    });
    assert.deepEqual(writes[0], { userId: "user_abc", patch: result.patch });
  });

  it("ignores a session that belongs to another user", async () => {
    const { writes, users } = memoryWriter();
    const result = await applyCheckoutSession(
      {
        status: "complete",
        client_reference_id: "user_other",
        customer: "cus_abc",
      },
      { users },
      { expectedUserId: "user_abc" },
    );
    assert.deepEqual(result, {
      ok: true,
      action: "ignored",
      reason: "checkout session belongs to another user",
    });
    assert.equal(writes.length, 0);
  });

  it("looks up clerkUserId from the Stripe customer when checkout metadata is missing", async () => {
    const { users } = memoryWriter();
    const result = await applyCheckoutSession(
      {
        status: "complete",
        customer: "cus_abc",
        subscription: "sub_abc",
      },
      {
        users,
        stripe: {
          async retrieveSubscription(id) {
            return { id, status: "trialing", customer: "cus_abc", metadata: {} };
          },
          async retrieveCustomer(id) {
            assert.equal(id, "cus_abc");
            return { id, metadata: { clerkUserId: "user_from_customer" } };
          },
        },
      },
    );
    assert.equal(result.ok && result.action === "updated", true);
    if (result.ok && result.action === "updated") {
      assert.equal(result.userId, "user_from_customer");
      assert.equal(result.patch.subscriptionStatus, "trialing");
    }
  });
});

describe("applyStripeEvent", () => {
  it("updates status from customer.subscription.updated", async () => {
    const { writes, users } = memoryWriter();
    const result = await applyStripeEvent(
      {
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_1",
            status: "past_due",
            customer: "cus_1",
            metadata: { clerkUserId: "user_1" },
          },
        },
      },
      { users },
    );
    assert.equal(result.ok && result.action === "updated", true);
    assert.equal(writes[0]?.patch.subscriptionStatus, "past_due");
    assert.equal(writes[0]?.patch.stripeCustomerId, "cus_1");
  });

  it("marks canceled on customer.subscription.deleted", async () => {
    const { writes, users } = memoryWriter();
    const result = await applyStripeEvent(
      {
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_1",
            status: "canceled",
            customer: "cus_1",
            metadata: { clerkUserId: "user_1" },
          },
        },
      },
      { users },
    );
    assert.equal(result.ok && result.action === "updated", true);
    assert.equal(writes[0]?.patch.subscriptionStatus, "canceled");
    assert.equal(writes[0]?.patch.stripeSubscriptionId, null);
  });

  it("ignores unrelated events", async () => {
    const { writes, users } = memoryWriter();
    const result = await applyStripeEvent(
      { type: "invoice.paid", data: { object: {} } },
      { users },
    );
    assert.deepEqual(result, { ok: true, action: "ignored", reason: "unhandled invoice.paid" });
    assert.equal(writes.length, 0);
  });

  it("stamps clerkUserId onto the Stripe customer after checkout", async () => {
    const { users } = memoryWriter();
    const stamped: { id: string; metadata: Record<string, string> }[] = [];
    await applyStripeEvent(
      {
        type: "checkout.session.completed",
        data: {
          object: {
            status: "complete",
            client_reference_id: "user_abc",
            customer: "cus_abc",
            subscription: {
              id: "sub_abc",
              status: "active",
              customer: "cus_abc",
              metadata: { clerkUserId: "user_abc" },
            },
          },
        },
      },
      {
        users,
        stripe: {
          async updateCustomerMetadata(id, metadata) {
            stamped.push({ id, metadata });
          },
        },
      },
    );
    assert.deepEqual(stamped, [{ id: "cus_abc", metadata: { clerkUserId: "user_abc" } }]);
  });
});
