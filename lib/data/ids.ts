/** Next `prefix_001`-style id from existing ids (`lead_001`, `inv_002`, `nudge_010`). */
export function nextPrefixedId(ids: Iterable<string>, prefix: string): string {
  let max = 0;
  const pattern = new RegExp(`^${prefix}_(\\d+)$`);
  for (const id of ids) {
    const match = pattern.exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}_${String(max + 1).padStart(3, "0")}`;
}
