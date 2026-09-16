import "server-only";

import { getMemoryStore } from "./memory-singleton";
import { SheetsDataStore } from "./sheets-store";
import type { DataStore } from "./types";

const globalForStore = globalThis as unknown as {
  stacklessSheetsStore?: SheetsDataStore;
};

/**
 * Default is the in-memory store so the UI runs without Google credentials.
 * It starts empty until you add people and invoices (or load `.data/local-store.json`).
 * Set STACKLESS_DATA_STORE=sheets after sharing a Sheet with the service account.
 */
export function getDataStore(): DataStore {
  if (process.env.STACKLESS_DATA_STORE === "sheets") {
    globalForStore.stacklessSheetsStore ??= new SheetsDataStore();
    return globalForStore.stacklessSheetsStore;
  }
  return getMemoryStore();
}
