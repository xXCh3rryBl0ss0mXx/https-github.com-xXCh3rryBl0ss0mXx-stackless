import { resolveDataStoreKind, type DataStoreKind } from "./store-kind";

export const WAITLIST_NEEDS_DATABASE =
  "Signup isn’t saved without a database. Waitlist emails need Neon (STACKLESS_DATA_STORE=neon and DATABASE_URL).";

export const SHEETS_WAITLIST_UNSUPPORTED =
  "Waitlist signup isn’t saved on the Sheets store. Use Neon.";

/** Trim, lowercase, and reject values that are not an email. */
export function parseWaitlistEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (
    !email ||
    !email.includes("@") ||
    email.startsWith("@") ||
    email.endsWith("@") ||
    /\s/.test(email)
  ) {
    throw new Error("That email doesn’t look right.");
  }
  return email;
}

/**
 * Memory and Sheets would claim success then lose the address on a new
 * serverless instance. Only Neon is durable.
 */
export function assertWaitlistCanPersist(
  kind: DataStoreKind = resolveDataStoreKind(),
): void {
  if (kind !== "neon") {
    throw new Error(WAITLIST_NEEDS_DATABASE);
  }
}
