export const MISSING_API_KEY =
  "Add RESEND_API_KEY to send email. Copy .env.example to .env.local and paste your key from the Resend dashboard.";

export const MISSING_FROM_EMAIL =
  "Add RESEND_FROM_EMAIL to send email. Use a verified domain in Resend, or Stackless <onboarding@resend.dev> for tests.";

export type ResendConfig =
  | { ok: true; apiKey: string; from: string }
  | { ok: false; error: string };

function readEnv(env: NodeJS.Dict<string>, name: string): string {
  return env[name]?.trim() ?? "";
}

/** Reads Resend settings. Safe to call at send time — never required to build. */
export function readResendConfig(env: NodeJS.Dict<string> = process.env): ResendConfig {
  const apiKey = readEnv(env, "RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, error: MISSING_API_KEY };
  }

  const from = readEnv(env, "RESEND_FROM_EMAIL");
  if (!from) {
    return { ok: false, error: MISSING_FROM_EMAIL };
  }

  return { ok: true, apiKey, from };
}
