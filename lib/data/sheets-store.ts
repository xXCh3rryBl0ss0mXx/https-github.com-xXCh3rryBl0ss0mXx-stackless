import type { DataStore, Invoice, Lead, Nudge } from "./types";

export const SHEETS_NOT_WIRED =
  "SheetsDataStore is a stub. Copy the CSVs in /data into a Google Sheet (see data/README.md), share that Sheet with a Google Cloud service account, then fill GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY. Leave STACKLESS_DATA_STORE=memory until that is wired.";

/** Placeholder so a real Sheets adapter can implement DataStore later. */
export class SheetsDataStore implements DataStore {
  async listLeadsNeedingFollowUp(): Promise<Lead[]> {
    throw new Error(SHEETS_NOT_WIRED);
  }

  async listOpenInvoices(): Promise<Invoice[]> {
    throw new Error(SHEETS_NOT_WIRED);
  }

  async listOverdueInvoices(): Promise<Invoice[]> {
    throw new Error(SHEETS_NOT_WIRED);
  }

  async listNudges(): Promise<Nudge[]> {
    throw new Error(SHEETS_NOT_WIRED);
  }

  async getLead(): Promise<Lead | null> {
    throw new Error(SHEETS_NOT_WIRED);
  }

  async getInvoice(): Promise<Invoice | null> {
    throw new Error(SHEETS_NOT_WIRED);
  }

  async createNudgeDraft(): Promise<Nudge> {
    throw new Error(SHEETS_NOT_WIRED);
  }

  async updateNudgeDraft(): Promise<Nudge> {
    throw new Error(SHEETS_NOT_WIRED);
  }

  async markNudgeSent(): Promise<void> {
    throw new Error(SHEETS_NOT_WIRED);
  }

  async markNudgeSkipped(): Promise<void> {
    throw new Error(SHEETS_NOT_WIRED);
  }
}
