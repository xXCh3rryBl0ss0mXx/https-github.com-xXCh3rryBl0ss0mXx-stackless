# Stackless starter data (Google Sheets)

Three tabs. Copy these CSVs into one Google Sheet (one tab per file).

The app does **not** need a Sheet to run. It starts with an in-memory copy of this seed data. A Sheets adapter can swap in later behind the same `DataStore` functions.

## How to make the Sheet

1. Open [Google Sheets](https://sheets.google.com) → Blank spreadsheet
2. Name it `Stackless data`
3. For each CSV below: File → Import → Upload → replace / insert a new sheet
    - `leads.csv` → tab name **leads**
    - `invoices.csv` → tab name **invoices**
    - `nudge_log.csv` → tab name **nudge_log**
4. Delete any empty default Sheet1 tab

Keep the **header row** (first row). Don’t rename columns — the app adapter looks for these exact names.

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
| scheduled_for | when it should go |
| sent_at | when it actually went |
| created_at | when the row was made |

## Thin adapter

App code only calls `DataStore` functions in `lib/data/types.ts` — never Google Sheets column letters. When you leave Sheets for a real database, swap the guts of those functions, not the whole app.
