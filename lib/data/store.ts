import "server-only";

import { getMemoryStore } from "./memory-singleton";
import { NeonDataStore } from "./neon-store";
import { SheetsDataStore } from "./sheets-store";
import { resolveDataStoreKind } from "./store-kind";
import type { DataStore } from "./types";

const globalForStore = globalThis as unknown as {
  stacklessSheetsStore?: SheetsDataStore;
  stacklessNeonStore?: NeonDataStore;
};

/**
 * Default is the in-memory store so the UI runs without a database.
 * It starts empty until you add people and invoices (or load `.data/local-store.json`).
 * Production: STACKLESS_DATA_STORE=neon with DATABASE_URL (Neon Postgres).
 * sheets remains a legacy option. postgres is an alias for neon.
 */
export function getDataStore(): DataStore {
  const kind = resolveDataStoreKind();
  if (kind === "neon") {
    globalForStore.stacklessNeonStore ??= new NeonDataStore();
    return globalForStore.stacklessNeonStore;
  }
  if (kind === "sheets") {
    globalForStore.stacklessSheetsStore ??= new SheetsDataStore();
    return globalForStore.stacklessSheetsStore;
  }
  return getMemoryStore();
}
