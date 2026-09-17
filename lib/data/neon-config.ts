export type NeonConfig = {
  databaseUrl: string;
};

export type NeonConfigResult =
  | { ok: true; databaseUrl: string }
  | { ok: false; error: string };

export function missingNeonUrlMessage(storeValue = "neon"): string {
  const mode = storeValue.trim() || "neon";
  return `STACKLESS_DATA_STORE is set to ${mode}, but DATABASE_URL is missing. Set DATABASE_URL to your Neon connection string on the server (never in the browser). See README.md.`;
}

export const MISSING_NEON_URL = missingNeonUrlMessage("neon");

function readEnv(env: NodeJS.Dict<string>, name: string): string {
  return env[name]?.trim() ?? "";
}

/** Safe to call at request time — never required to build. */
export function readNeonConfig(
  env: NodeJS.Dict<string> = process.env,
): NeonConfigResult {
  const databaseUrl = readEnv(env, "DATABASE_URL");
  if (!databaseUrl) {
    const mode = readEnv(env, "STACKLESS_DATA_STORE") || "neon";
    return { ok: false, error: missingNeonUrlMessage(mode) };
  }
  return { ok: true, databaseUrl };
}
