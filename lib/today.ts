export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
