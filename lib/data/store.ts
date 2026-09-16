import "server-only";

import { getMemoryStore } from "./memory-singleton";
import { SheetsDataStore } from "./sheets-store";
import type { DataStore } from "./types";

const globalForStore = globalThis as unknown as {
  stacklessSheetsStore?: SheetsDataStore;
};

/**
 * Default is the seed-backed store so the UI runs without Google credentials.
 * Set STACKLESS_DATA_STORE=sheets after sharing a Sheet with the service account.
 */
export function getDataStore(): DataStore {
  if (process.env.STACKLESS_DATA_STORE === "sheets") {
    globalForStore.stacklessSheetsStore ??= new SheetsDataStore();
    return globalForStore.stacklessSheetsStore;
  }
  return getMemoryStore();
}
