import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDataStoreKind } from "./store-kind";

describe("resolveDataStoreKind", () => {
  it("defaults to memory when unset or unknown", () => {
    assert.equal(resolveDataStoreKind({}), "memory");
    assert.equal(resolveDataStoreKind({ STACKLESS_DATA_STORE: "memory" }), "memory");
    assert.equal(resolveDataStoreKind({ STACKLESS_DATA_STORE: "  MEMORY  " }), "memory");
    assert.equal(resolveDataStoreKind({ STACKLESS_DATA_STORE: "sqlite" }), "memory");
  });

  it("selects neon for neon and postgres", () => {
    assert.equal(resolveDataStoreKind({ STACKLESS_DATA_STORE: "neon" }), "neon");
    assert.equal(resolveDataStoreKind({ STACKLESS_DATA_STORE: "Postgres" }), "neon");
    assert.equal(resolveDataStoreKind({ STACKLESS_DATA_STORE: " postgres " }), "neon");
  });

  it("keeps sheets as a legacy option", () => {
    assert.equal(resolveDataStoreKind({ STACKLESS_DATA_STORE: "sheets" }), "sheets");
  });
});
