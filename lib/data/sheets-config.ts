import type { SheetTable } from "./sheets-map";

export type SheetsGateway = {
  read(tab: string): Promise<SheetTable>;
  appendRow(tab: string, values: string[]): Promise<void>;
  updateRow(tab: string, dataRowIndex: number, values: string[]): Promise<void>;
  deleteRow(tab: string, dataRowIndex: number): Promise<void>;
};

export type SheetsConfig = {
  spreadsheetId: string;
  email: string;
  privateKey: string;
};

export const MISSING_SHEETS_CREDS =
  "STACKLESS_DATA_STORE is set to sheets, but Google credentials are missing. Set GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY on the server (never in the browser). See data/README.md.";

function readEnv(env: NodeJS.Dict<string>, name: string): string {
  return env[name]?.trim() ?? "";
}

export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

export function normalizeSpreadsheetId(raw: string): string {
  const trimmed = raw.trim();
  const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(trimmed);
  return match?.[1] ?? trimmed;
}

export type SheetsConfigResult =
  | { ok: true; config: SheetsConfig }
  | { ok: false; error: string };

/** Safe to call at request time — never required to build. */
export function readSheetsConfig(
  env: NodeJS.Dict<string> = process.env,
): SheetsConfigResult {
  const spreadsheetId = normalizeSpreadsheetId(readEnv(env, "GOOGLE_SHEETS_SPREADSHEET_ID"));
  const email = readEnv(env, "GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = normalizePrivateKey(readEnv(env, "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"));
  if (!spreadsheetId || !email || !privateKey) {
    return { ok: false, error: MISSING_SHEETS_CREDS };
  }
  return { ok: true, config: { spreadsheetId, email, privateKey } };
}
