-- Stackless production schema (Neon Postgres).
-- Tables match the DataStore types in lib/data/types.ts (leads, invoices, nudge_log).
-- The app also runs these CREATE statements on first use (IF NOT EXISTS), so you
-- can skip pasting this if you only set DATABASE_URL + STACKLESS_DATA_STORE=neon.
-- Optional: SQL Editor in the Neon console → paste this file → Run.

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  status TEXT NOT NULL,
  last_contact_at TEXT,
  next_follow_up_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  amount_usd DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL,
  due_date TEXT NOT NULL,
  last_nudged_at TEXT,
  payment_link TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nudge_log (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  related_id TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  draft_text TEXT NOT NULL,
  status TEXT NOT NULL,
  scheduled_for TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  last_error TEXT,
  send_attempts INTEGER
);

CREATE INDEX IF NOT EXISTS nudge_log_related_id_idx ON nudge_log (related_id);

CREATE INDEX IF NOT EXISTS nudge_log_status_idx ON nudge_log (status);

CREATE INDEX IF NOT EXISTS leads_next_follow_up_at_idx ON leads (next_follow_up_at);

CREATE INDEX IF NOT EXISTS invoices_due_date_idx ON invoices (due_date);
