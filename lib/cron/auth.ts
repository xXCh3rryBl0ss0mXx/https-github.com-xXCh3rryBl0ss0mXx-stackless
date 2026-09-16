import { timingSafeEqual } from "node:crypto";

export const MISSING_CRON_SECRET =
  "Add CRON_SECRET so scheduled sends can run. Copy .env.example and set a long random value in Vercel.";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401; error: string };

function bearerToken(header: string | null): string {
  if (!header) return "";
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match?.[1] ?? "";
}

function secretsEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Fail closed if the secret is missing. */
export function authorizeCronRequest(
  request: Request,
  env: NodeJS.Dict<string> = process.env,
): CronAuthResult {
  const secret = env.CRON_SECRET?.trim() ?? "";
  if (!secret) {
    return { ok: false, status: 401, error: MISSING_CRON_SECRET };
  }
  const token = bearerToken(request.headers.get("authorization"));
  if (!token || !secretsEqual(token, secret)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}
