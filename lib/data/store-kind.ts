export type DataStoreKind = "memory" | "neon" | "sheets";

/**
 * STACKLESS_DATA_STORE:
 * - memory (default) — local/CI, no database
 * - neon | postgres — Neon Postgres (recommended for Production)
 * - sheets — legacy Google Sheets
 */
export function resolveDataStoreKind(
  env: NodeJS.Dict<string> = process.env,
): DataStoreKind {
  const raw = (env.STACKLESS_DATA_STORE ?? "memory").trim().toLowerCase();
  if (raw === "neon" || raw === "postgres") return "neon";
  if (raw === "sheets") return "sheets";
  return "memory";
}
