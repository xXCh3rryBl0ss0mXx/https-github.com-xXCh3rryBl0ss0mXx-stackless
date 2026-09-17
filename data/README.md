# Stackless data (Neon + optional Sheets)

**Production:** Neon Postgres. Create a free project, set `DATABASE_URL` and `STACKLESS_DATA_STORE=neon`. Schema: [`schema.sql`](schema.sql) (the app also bootstraps `CREATE TABLE IF NOT EXISTS`). Steps: [README.md](../README.md) → Neon Postgres.

Default `STACKLESS_DATA_STORE=memory` starts with no records and needs no database. Sheets below is **legacy / optional** — not the recommended production path.

## Google Sheets tabs (legacy)

Three tabs. Copy these CSVs into one Google Sheet (one tab per file). They are **header rows only** — the app starts empty until you add people, invoices, and nudges.

The app does **not** need a Sheet to run. Set `STACKLESS_DATA_STORE=sheets` only after the service account can edit the Sheet.

## How to make the Sheet

1. Open [Google Sheets](https://sheets.google.com) → Blank spreadsheet
2. Name it `Stackless data`
3. For each CSV below: File → Import → Upload → replace / insert a new sheet
    - `leads.csv` → tab name **leads**
    - `invoices.csv` → tab name **invoices**
    - `nudge_log.csv` → tab name **nudge_log**
4. Delete any empty default Sheet1 tab

Keep the **header row** (first row). Don’t rename columns — the app adapter looks for these exact names. Optional columns (`company`, `notes`, `payment_link`, and the other blanks in the CSVs) can be missing; required columns cannot.

## Connect a service account

Credentials stay on the server (`GOOGLE_*` in `.env.local` / Vercel). Never use `NEXT_PUBLIC_` for these.

1. [Google Cloud Console](https://console.cloud.google.com/) → create or pick a project
2. **APIs & Services** → **Library** → enable **Google Sheets API**
3. **IAM & Admin** → **Service Accounts** → **Create service account** (name it e.g. `stackless-sheets`)
4. Open the account → **Keys** → **Add key** → **Create new key** → JSON. Save the file somewhere private — not in this repo.
5. From that JSON, copy:
    - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
    - `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (keep the `-----BEGIN PRIVATE KEY-----` block; if you paste it as one line, keep the `\n` characters)
6. Spreadsheet id from the URL `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit` → `GOOGLE_SHEETS_SPREADSHEET_ID`
7. In Google Sheets: **Share** → paste the service account email → role **Editor** → uncheck notify → **Share**
8. Set `STACKLESS_DATA_STORE=sheets` in `.env.local` (only if you are using Sheets instead of Neon)
9. Restart the app. If sheets mode is on but a value is missing, `/app` shows a peach error instead of a stack trace.

Leave `STACKLESS_DATA_STORE=memory` if you have not connected Neon or Sheets yet. Prefer Neon for Production.

## Tabs (simple)

### leads — people you might work with
| column | meaning |
| --- | --- |
| id | unique id (e.g. lead_001) |
| name | person name |
| email | email |
| company | optional |
| status | `new` / `waiting_on_them` / `waiting_on_you` / `won` / `lost` |
| last_contact_at | last time you talked (YYYY-MM-DD) |
| next_follow_up_at | when to nudge next |
| notes | free text |
| created_at | when the lead was added |

### invoices — money owed / paid
| column | meaning |
| --- | --- |
| id | unique id (e.g. inv_001) |
| client_name | who owes |
| client_email | email |
| invoice_number | e.g. 1042 |
| amount_usd | dollars (no $ sign) |
| status | `open` / `paid` / `void` |
| due_date | YYYY-MM-DD |
| last_nudged_at | last reminder sent |
| payment_link | optional URL |
| created_at | when created |

### nudge_log — drafts + sent reminders
| column | meaning |
| --- | --- |
| id | unique id |
| kind | `follow_up` or `invoice` |
| related_id | lead id or invoice id |
| channel | `email` (SMS later) |
| draft_text | the message |
| status | `draft` / `sent` / `skipped` |
| scheduled_for | when auto-send should go (YYYY-MM-DD or ISO datetime). Blank = no auto-send |
| sent_at | when it actually went |
| created_at | when the row was made |
| last_error | last auto-send error (optional; cron writes this on failure) |
| send_attempts | failed auto-send count (optional; cron stops after 5) |

## Thin adapter

App code only calls `DataStore` functions in `lib/data/types.ts` — never SQL or Google Sheets column letters. `MemoryDataStore`, `NeonDataStore`, and `SheetsDataStore` all implement the same create/update/delete methods for leads and invoices, and persist `scheduledFor` on nudge create **and** update (plus `last_error` / `send_attempts` on failed auto-sends). Deleting a lead or invoice also removes **draft** nudges for that row (`related_id` + `status=draft`) so Today’s List / Recent nudges never tries to send against a missing person or invoice. Sent and skipped nudge rows stay as history. Neon is the production store; swapping stores does not change `/app`.
