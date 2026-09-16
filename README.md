# Stackless

Marketing landing for Stackless — a quiet inbox helper for freelancers.

Early access signup uses [Clerk](https://clerk.com) **Waitlist** mode (email in, you’re on the list). Use **email only** — no Google, no phone.

The paid product loop lives at **`/app`** (Clerk-gated when keys are set): add and edit people and invoices, follow-ups and overdue invoices, editable drafts, send email via Resend, skip.

The Clerk application for this project is:

`app_3JNTon4xdJiXqaN3kf6Ng4WI66p`

Open it from [https://dashboard.clerk.com](https://dashboard.clerk.com) (it should show up in your app list as Stackless). Copy keys from **that** app, not a new one.

## Local preview

```bash
npm install
cp .env.example .env.local
```

Paste the two Clerk keys into `.env.local` (see below), then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Signed out: the **top-right Sign Up** chip opens Clerk sign-up. **Get early access** (hero and bottom) opens the waitlist — not a `mailto:` link.
- After you join: **You’re on the list** (also at `/waitlist?joined=1`).
- Signed in: **Today’s List** (opens `/app`) sits next to your Clerk profile button (UserButton). Signed out (and while Clerk loads, or without Clerk keys) the header only shows **Sign Up**.
- The profile menu still has **Manage account** and **Sign out**. Manage account opens the peach `/account` page (Clerk profile options, not a black Clerk portal). Sign out still signs you out.
- `/sign-up` and `/waitlist` are the same peach pages if you open them directly.
- `/app` is today’s follow-up + overdue invoice list. Without Clerk keys it still opens so you can add people and invoices. With keys, signed-out visits go to the peach `/sign-in` page (not Clerk’s hosted Account Portal), then back to `/app`. Unsigned `/account` visits go to the same peach Sign In, then back to `/account`.

`npm run build` works **without** Clerk keys. The peach landing still shows, and the buttons go to `/waitlist`. Signup only saves an email after you add the keys. Vercel preview/production **do** need the keys, then a **Redeploy**.

## Today’s List (`/app`)

Two queues: people whose follow-up date is due, and open invoices past their due date. Each row has an editable draft. **Save draft**, **Send email**, and **Skip** all go through `DataStore` (`lib/data/types.ts`).

**Add a person** / **Add an invoice** sit above the queues. After you save, anyone with a follow-up date of today (or earlier) and any **open** invoice due today (or earlier) shows up so you can draft and send a nudge. **Your people** and **Your invoices** list everything for edit (status, dates, notes). Edit forms have **Save changes** and **Delete** on the same row. Delete asks you to confirm (same in-card peach confirm as Send email), then removes that person or invoice. Draft nudges for them go too; sent and skipped notes stay in Recent nudges.

**Send email** asks you to confirm, then sends through [Resend](https://resend.com) to the lead/client address. Subjects are **Quick check-in** (follow-ups) and **Invoice reminder** (invoices); the body is the draft you edited. The nudge is marked `sent` (with `sentAt`) **only if Resend accepts the mail**. If it fails — missing keys, bad from-address, Resend error — the draft stays a draft and the peach error on the card tells you why. Nothing is sent on a schedule yet (no Vercel Cron in this version).

Until a Google Sheet is connected, the default store is in-memory and **starts empty** — add a person or an invoice from `/app`. The CSVs in [`data/`](data/) are header rows only (a Sheets copy can be empty headers too). Locally, mutations also write `.data/local-store.json` (gitignored). On a read-only host that file is skipped and the process keeps an in-memory copy.

### Resend (required to actually send)

The site still **builds** without these. Send email will say **Add RESEND_API_KEY** until you paste a real key (no sample secrets).

1. Make an account at [resend.com](https://resend.com).
2. Open [API Keys](https://resend.com/api-keys) → **Create API Key** → copy it.
3. Put it in `.env.local` as `RESEND_API_KEY=`.
4. Set `RESEND_FROM_EMAIL`:
   - **Testing:** `Stackless <onboarding@resend.dev>` — Resend’s onboarding address. It can only send **to the email on your Resend account**, not to random clients.
   - **Real client mail:** [Domains](https://resend.com/domains) → add your domain → add the DNS records they show → wait until it says verified. Then use an address on that domain, like `Stackless <hello@yourdomain.com>`.
5. Restart `npm run dev`. Tap **Send email** on `/app`, confirm, and check the inbox (or Resend’s **Emails** log).
6. On Vercel: **Settings** → **Environment Variables** → add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for Production / Preview / Development → **Redeploy**.

The send path is server-only (`sendNudgeAction` in `app/app/actions.ts`). The `resend` package is never imported from a client component.

### Google Sheets (optional)

Leave `STACKLESS_DATA_STORE=memory` until a Sheet is connected. Preview and Production work without Google. Setting `STACKLESS_DATA_STORE=sheets` without credentials shows a clear error on `/app` (no sample keys).

When you want a real Sheet:

1. Copy `data/leads.csv`, `data/invoices.csv`, and `data/nudge_log.csv` into one Google Sheet (tabs **leads**, **invoices**, **nudge_log**). Those files are header rows only — a Sheets copy can start empty too. Full steps: [`data/README.md`](data/README.md).
2. In [Google Cloud Console](https://console.cloud.google.com/), create a project (or pick one) → **APIs & Services** → enable **Google Sheets API**.
3. **IAM & Admin** → **Service Accounts** → **Create service account**. Open it → **Keys** → **Add key** → JSON. Open the JSON locally; you need `client_email` and `private_key`. Do not commit the file.
4. Open the Sheet → **Share** → paste the service account email → **Editor** → uncheck “notify” → Share.
5. Put these in `.env.local` / Vercel (paste yours — no samples). They are **server-only** — never prefix with `NEXT_PUBLIC_`.
   - `GOOGLE_SHEETS_SPREADSHEET_ID` — the id in `https://docs.google.com/spreadsheets/d/THIS_PART/edit`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — `client_email` from the JSON
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — `private_key` from the JSON. If it is one line, keep the `\n` sequences.
6. Set `STACKLESS_DATA_STORE=sheets`.
7. Restart `npm run dev` (or Redeploy on Vercel). `/app` reads and writes the three tabs.

To go back to the in-memory store (empty until you add records, or whatever is in `.data/local-store.json`), set `STACKLESS_DATA_STORE=memory` again.

## Clerk setup (do this once)

You already have the app. You still have to turn on Waitlist and paste keys yourself.

### 1. Open the Stackless Clerk app

1. Open [https://dashboard.clerk.com](https://dashboard.clerk.com) and log in.
2. Open the app with id `app_3JNTon4xdJiXqaN3kf6Ng4WI66p`.
3. Under user login methods, keep **Email** on. Leave Google, phone, and other social logins **off**.

If you ever need a new app: **Create application** → name it `Stackless` → email only.

### 2. Turn on Waitlist

Waitlist is what “Get early access” uses. If this is off, signup will error.

1. In the left sidebar, click **Waitlist**.
2. Turn **Enable waitlist** on, then **Save**.

If you don’t see **Waitlist**, look for **Configure** → **Access mode** or **Restrictions**, choose **Waitlist**, and save.

### 3. Copy the two keys

1. In the sidebar, click **API keys**.
2. Copy the **Publishable key** (starts with `pk_test_` or `pk_live_`).
3. Copy the **Secret key** (starts with `sk_test_` or `sk_live_`). Keep this one private — it is not for the browser.

### 4. Put the keys on your computer

```bash
cp .env.example .env.local
```

Open `.env.local` and paste the two values after the `=` signs (no quotes):

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Save the file. Restart `npm run dev` if it was already running.

Optional: on **your** computer (this needs a browser login the cloud agent cannot finish):

```bash
npx clerk@latest auth login
npx clerk@latest init --app app_3JNTon4xdJiXqaN3kf6Ng4WI66p
```

That links this repo to the Stackless Clerk app and can write `.env.local`. Don’t commit that file. Or skip the CLI and paste the two keys by hand as above.

### 5. Put the same keys on Vercel

Preview deploys stay broken for signup until this is done.

1. Open the Stackless project on [Vercel](https://vercel.com).
2. Go to **Settings** → **Environment Variables**.
3. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and paste the publishable key.
4. Add `CLERK_SECRET_KEY` and paste the secret key.
5. Enable **Production**, **Preview**, and **Development** for both.
6. Save.
7. Go to **Deployments**, open the latest one, click the **⋯** menu → **Redeploy**.

After that, “Get early access” on the live site should save emails. In Clerk, open **Waitlist** to see who joined. You can approve people later when the product is ready.

## Deploy

This is a Next.js app and can be deployed from this repo on [Vercel](https://vercel.com).
