/** Parse `scheduledFor` (YYYY-MM-DD or ISO datetime) into a Date. */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseScheduledFor(value: string | undefined): Date | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (DATE_ONLY.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00.000Z`);
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isScheduledDue(scheduledFor: string | undefined, now: Date): boolean {
  const when = parseScheduledFor(scheduledFor);
  if (!when) return false;
  return when.getTime() <= now.getTime();
}

/** Normalize a form value to YYYY-MM-DD or ISO. Empty → undefined. */
export function scheduledForFromInput(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (DATE_ONLY.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("That send time doesn’t look right.");
  }
  return parsed.toISOString();
}

export function isoDaysFromNow(days: number, now: Date = new Date()): string {
  const next = new Date(now.getTime());
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

export function isoToDatetimeLocal(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (DATE_ONLY.test(trimmed)) return `${trimmed}T09:00`;
  const when = parseScheduledFor(trimmed);
  if (!when) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T${pad(when.getHours())}:${pad(when.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

export function formatScheduledFor(value: string): string {
  const trimmed = value.trim();
  const when = parseScheduledFor(trimmed);
  if (!when) return trimmed;
  if (DATE_ONLY.test(trimmed)) {
    return when.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return when.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function clipError(error: string, max = 500): string {
  const trimmed = error.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
