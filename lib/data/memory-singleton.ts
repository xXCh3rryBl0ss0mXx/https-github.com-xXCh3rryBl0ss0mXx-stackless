import { MemoryDataStore } from "./memory-store";
import { loadSnapshot, saveSnapshot } from "./persist";
import { seedInvoices, seedLeads, seedNudges } from "./seed";

const globalForStore = globalThis as unknown as {
  stacklessMemoryStore?: MemoryDataStore;
};

/** Process singleton. Loads `.data/local-store.json` if present, else an empty store. */
export function getMemoryStore(): MemoryDataStore {
  if (!globalForStore.stacklessMemoryStore) {
    globalForStore.stacklessMemoryStore = new MemoryDataStore(
      loadSnapshot() ?? {
        leads: seedLeads,
        invoices: seedInvoices,
        nudges: seedNudges,
      },
      saveSnapshot,
    );
  }
  return globalForStore.stacklessMemoryStore;
}
