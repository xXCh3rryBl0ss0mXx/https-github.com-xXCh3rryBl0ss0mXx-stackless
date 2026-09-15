import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { StoreSnapshot } from "./types";

const filePath = join(process.cwd(), ".data", "local-store.json");

export function loadSnapshot(): StoreSnapshot | null {
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as StoreSnapshot;
    if (!Array.isArray(parsed.leads) || !Array.isArray(parsed.invoices) || !Array.isArray(parsed.nudges)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSnapshot(snapshot: StoreSnapshot): void {
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(snapshot, null, 2)}\n`);
  } catch {
    // Read-only hosts (typical Vercel) stay in-memory for that process.
  }
}
