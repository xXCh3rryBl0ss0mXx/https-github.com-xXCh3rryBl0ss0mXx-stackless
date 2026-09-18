import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dataOwnerIdFromAuth, isOwnedBy, LOCAL_DATA_OWNER_ID, ownedByUser, requireOwnerId } from "./owner";

describe("requireOwnerId", () => {
  it("trims a Clerk user id and rejects a blank one", () => {
    assert.equal(requireOwnerId("  user_abc  "), "user_abc");
    assert.throws(() => requireOwnerId(""), /Missing user id/);
    assert.throws(() => requireOwnerId("   "), /Missing user id/);
  });
});

describe("isOwnedBy", () => {
  it("matches only the same non-empty owner", () => {
    assert.equal(isOwnedBy("user_a", "user_a"), true);
    assert.equal(isOwnedBy("user_a", "user_b"), false);
    assert.equal(isOwnedBy("user_a", undefined), false);
    assert.equal(isOwnedBy("user_a", ""), false);
    assert.equal(isOwnedBy("user_a", null), false);
    assert.equal(isOwnedBy("", "user_a"), false);
  });

  it("does not treat unowned rows as belonging to every user", () => {
    const rows = [
      { id: "lead_owned", userId: "user_a" },
      { id: "lead_other", userId: "user_b" },
      { id: "lead_legacy" },
      { id: "lead_blank", userId: "" },
    ];
    assert.deepEqual(
      ownedByUser(rows, "user_a").map((row) => row.id),
      ["lead_owned"],
    );
    assert.deepEqual(
      ownedByUser(rows, "user_b").map((row) => row.id),
      ["lead_other"],
    );
  });
});

describe("dataOwnerIdFromAuth", () => {
  it("uses local only when Clerk is not configured", () => {
    assert.equal(
      dataOwnerIdFromAuth({ clerkConfigured: false, userId: null }),
      LOCAL_DATA_OWNER_ID,
    );
    assert.equal(
      dataOwnerIdFromAuth({ clerkConfigured: false, userId: "user_should_not_matter" }),
      LOCAL_DATA_OWNER_ID,
    );
  });

  it("requires the signed-in Clerk user id when Clerk is on", () => {
    assert.equal(
      dataOwnerIdFromAuth({ clerkConfigured: true, userId: "user_abc" }),
      "user_abc",
    );
    assert.throws(
      () => dataOwnerIdFromAuth({ clerkConfigured: true, userId: null }),
      /Missing user id/,
    );
    assert.throws(
      () => dataOwnerIdFromAuth({ clerkConfigured: true, userId: "" }),
      /Missing user id/,
    );
  });
});
