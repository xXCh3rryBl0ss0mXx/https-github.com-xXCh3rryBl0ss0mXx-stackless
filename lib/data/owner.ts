/** Clerk user id that owns a row. Blank/missing = unowned legacy data. */

export function requireOwnerId(userId: string): string {
  const trimmed = userId.trim();
  if (!trimmed) {
    throw new Error("Missing user id.");
  }
  return trimmed;
}

export function ownerIdOf(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed || undefined;
}

/** Unowned rows (null/blank user id) never match a signed-in user. */
export function isOwnedBy(
  userId: string,
  rowUserId: string | null | undefined,
): boolean {
  const owner = userId.trim();
  const row = ownerIdOf(rowUserId);
  return Boolean(owner) && row === owner;
}

export function ownedByUser<T extends { userId?: string }>(
  rows: readonly T[],
  userId: string,
): T[] {
  const owner = requireOwnerId(userId);
  return rows.filter((row) => isOwnedBy(owner, row.userId));
}

/**
 * Local/CI when Clerk keys are missing. Not a Clerk id, and never used as a
 * guessed owner for existing Neon rows.
 */
export const LOCAL_DATA_OWNER_ID = "local";

export function dataOwnerIdFromAuth(input: {
  clerkConfigured: boolean;
  userId: string | null | undefined;
}): string {
  if (!input.clerkConfigured) return LOCAL_DATA_OWNER_ID;
  return requireOwnerId(input.userId ?? "");
}
