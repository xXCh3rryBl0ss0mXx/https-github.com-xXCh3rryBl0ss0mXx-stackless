import { getMemoryStore } from "./memory-singleton";
import { SheetsDataStore } from "./sheets-store";
import type { DataStore } from "./types";

/**
 * Default is the seed-backed store so the UI runs without Google credentials.
 * Set STACKLESS_DATA_STORE=sheets only after a real adapter is wired.
 */
export function getDataStore(): DataStore {
  if (process.env.STACKLESS_DATA_STORE === "sheets") {
    return new SheetsDataStore();
  }
  return getMemoryStore();
}
