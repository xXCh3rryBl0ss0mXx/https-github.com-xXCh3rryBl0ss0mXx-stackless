import { google } from "googleapis";
import type { SheetTable } from "./sheets-map";
import type { SheetsConfig, SheetsGateway } from "./sheets-config";

function quoteRange(tab: string, suffix = ""): string {
  const escaped = tab.replace(/'/g, "''");
  return `'${escaped}'${suffix}`;
}

function wrapSheetsError(tab: string, err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  throw new Error(
    `Couldn’t use Google Sheet tab "${tab}". Share the Sheet with the service account as Editor, check GOOGLE_SHEETS_SPREADSHEET_ID, and keep tab names leads / invoices / nudge_log. ${message}`,
  );
}

export class GoogleSheetsGateway implements SheetsGateway {
  private sheets: ReturnType<typeof google.sheets>;
  private readonly config: SheetsConfig;
  private readonly sheetIds = new Map<string, number>();

  constructor(config: SheetsConfig) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.email,
        private_key: config.privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.sheets = google.sheets({ version: "v4", auth });
    this.config = config;
  }

  async read(tab: string): Promise<SheetTable> {
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: quoteRange(tab),
      });
      const values = (res.data.values ?? []).map((row) =>
        (row ?? []).map((cell) => String(cell ?? "")),
      );
      if (values.length === 0) {
        throw new Error(
          `Google Sheet tab "${tab}" is empty. Add the header row from data/README.md.`,
        );
      }
      const headers = values[0].map((header) => header.trim());
      const rows = values.slice(1);
      return { headers, rows };
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Google Sheet tab")) throw err;
      wrapSheetsError(tab, err);
    }
  }

  async appendRow(tab: string, values: string[]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.config.spreadsheetId,
        range: quoteRange(tab),
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [values] },
      });
    } catch (err) {
      wrapSheetsError(tab, err);
    }
  }

  async updateRow(tab: string, dataRowIndex: number, values: string[]): Promise<void> {
    const sheetRow = dataRowIndex + 2;
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range: quoteRange(tab, `!A${sheetRow}`),
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [values] },
      });
    } catch (err) {
      wrapSheetsError(tab, err);
    }
  }

  async deleteRow(tab: string, dataRowIndex: number): Promise<void> {
    const sheetId = await this.sheetIdForTab(tab);
    const startIndex = dataRowIndex + 1;
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.config.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex,
                  endIndex: startIndex + 1,
                },
              },
            },
          ],
        },
      });
    } catch (err) {
      wrapSheetsError(tab, err);
    }
  }

  private async sheetIdForTab(tab: string): Promise<number> {
    const cached = this.sheetIds.get(tab);
    if (cached != null) return cached;
    try {
      const res = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
        fields: "sheets.properties(sheetId,title)",
      });
      for (const sheet of res.data.sheets ?? []) {
        const title = sheet.properties?.title;
        const sheetId = sheet.properties?.sheetId;
        if (title && sheetId != null) this.sheetIds.set(title, sheetId);
      }
    } catch (err) {
      wrapSheetsError(tab, err);
    }
    const sheetId = this.sheetIds.get(tab);
    if (sheetId == null) {
      throw new Error(
        `Couldn’t use Google Sheet tab "${tab}". Share the Sheet with the service account as Editor, check GOOGLE_SHEETS_SPREADSHEET_ID, and keep tab names leads / invoices / nudge_log. No tab named "${tab}".`,
      );
    }
    return sheetId;
  }
}
