# Stackless

Marketing landing for Stackless — a quiet inbox helper for freelancers.

Early access signup uses [Clerk](https://clerk.com) **Waitlist** mode (email in, you’re on the list). Use **email only** — no Google, no phone.

The paid product loop lives at **`/app`** (Clerk-gated when keys are set, then a **$19/month** Stripe subscription): add and edit people and invoices, follow-ups and overdue invoices, editable drafts, send email via Resend, skip. Waitlist signup still exists; the workspace itself requires an active subscription.

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

- Signed out: the header shows outline **Sign In** (`/sign-in`) immediately left of peach **Sign Up** (`/sign-up`). **Get early access** (hero and bottom) opens the waitlist — not a `mailto:` link.
- After you join: **You’re on the list** (also at `/waitlist?joined=1`).
- Signed in: **Today’s List** (opens `/app`) sits next to your Clerk profile button (UserButton). Signed out (and while Clerk loads, or without Clerk keys) the header shows **Sign In** and **Sign Up**, not Today’s List.
- The profile menu still has **Manage account** and **Sign out**. Manage account opens the peach `/account` page (Clerk profile options, not a black Clerk portal). Sign out still signs you out.
- `/sign-up` and `/waitlist` are the same peach pages if you open them directly.
- `/app` is today’s follow-up + overdue invoice list. Without Clerk keys it still opens so you can add people and invoices. With keys, signed-out visits go to the peach `/sign-in` page (not Clerk’s hosted Account Portal), then back to `/app`. Signed in without an active Stripe subscription, `/app` shows a peach **paywall** (Subscribe — $19/month), not a crash. Unsigned `/account` visits go to the same peach Sign In, then back to `/account`.

`npm run build` works **without** Clerk, Stripe, Resend, Google, or `DATABASE_URL`. The peach landing still shows, and the buttons go to `/waitlist`. Signup only saves an email after you add the Clerk keys. Checkout is disabled until Stripe keys + `STRIPE_PRICE_ID` are set. Vercel preview/production **do** need Clerk (and Stripe for payments), then a **Redeploy**.


## Today’s List (`/app`)

Two queues used to fight each other. **Due today** is now one list: people whose follow-up date is due, and open invoices past their due date. Each row has a short note. **Send**, **Schedule**, and **Skip** are the primary actions (all go through `DataStore` in `lib/data/types.ts`). **Edit** is secondary. **Save note** keeps a draft without sending.

**Add** is one control — pick Person or Invoice. A person is just **name + email** (status defaults to `new` behind the scenes; no company field). An invoice is **client name, email, amount, due date, and invoice number** (status defaults to `open`). After you save, anyone with no follow-up date (or a date of today or earlier) and any **open** invoice due today or earlier lands on Due today. **Everyone else** is a quiet list for records that aren’t due. Edit forms have **Save changes** and **Delete** on the same row. Delete asks you to confirm (same in-card peach confirm as Send), then removes that person or invoice. Draft nudges for them go too; sent and skipped notes stay in quiet **Recent**.

**Send** asks you to confirm, then sends through [Resend](https://resend.com) to the lead/client address. Subjects are **Quick check-in** (follow-ups) and **Invoice reminder** (invoices); the body is the note you edited. The nudge is marked `sent` (with `sentAt`) **only if Resend accepts the mail**. If it fails — missing keys, bad from-address, Resend error — the draft stays a draft and the peach error on the card tells you why.

**Schedule** (on the same card): pick a future date/time, or a shortcut like **In 3 days**, then **Save for later**. Status stays `draft` until the mail goes out. A daily Vercel Cron job (`/api/cron/send-due-nudges`, 15:00 UTC) sends due drafts through the same Resend path as **Send**. Unscheduled drafts are not auto-sent.

The default store is in-memory and **starts empty** — add a person or an invoice from `/app`. Locally, mutations also write `.data/local-store.json` (gitignored). On a read-only host that file is skipped and the process keeps an in-memory copy. **Production auto-sends need Neon Postgres** (`STACKLESS_DATA_STORE=neon` + `DATABASE_URL`) so a scheduled draft is still there when cron runs. Google Sheets is a legacy option, not the recommended path.


### Stripe ($19/month — required for the live workspace)

One plan: **$19/month**. Hosted [Stripe Checkout](https://stripe.com/docs/payments/checkout) to subscribe, [Customer Portal](https://stripe.com/docs/customer-management) to cancel or update the card. The webhook writes `{ stripeCustomerId, subscriptionStatus }` onto the Clerk user (`publicMetadata` + `privateMetadata`). **Send** and the rest of `/app` check that status.

The site still **builds** without Stripe keys. With Clerk on and Stripe missing, `/app` shows a peach paywall that explains which env var to add (Checkout is disabled). Secrets stay server-only except `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

#### 1. Create the $19/month Price (Stripe Dashboard)

1. Open [https://dashboard.stripe.com](https://dashboard.stripe.com) (use **test** mode first, then live).
2. **Product catalog** → **Add product**.
3. Name it `Stackless`. Description can be “Today’s List — follow-ups and invoice nudges.”
4. Price: **Recurring** → **$19.00 USD** → **Monthly**. Do **not** hardcode this Price id in the repo.
5. Save. Copy the **Price ID** (`price_...`) into `STRIPE_PRICE_ID`.

#### 2. Turn on the Customer Portal

1. Stripe Dashboard → **Settings** → **Billing** → **Customer portal**.
2. Enable it. Allow customers to **cancel subscriptions** and **update payment methods**.
3. Save. No portal link in code — `/app` and `/account` open a portal session when the user already has a Stripe customer id.

#### 3. Webhook (production)

1. **Developers** → **Webhooks** → **Add endpoint**.
2. Endpoint URL: `https://www.stackless.lol/api/stripe/webhook` (the Next.js route in this repo).
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Add endpoint. Open it → **Signing secret** → copy `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
5. Copy **API keys**: Secret (`sk_test_` / `sk_live_`) → `STRIPE_SECRET_KEY`. Publishable (`pk_test_` / `pk_live_`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

Locally you can forward events with `stripe listen --forward-to localhost:3000/api/stripe/webhook` and use the `whsec_` it prints.

#### 4. Michael’s Vercel steps

Preview/production stay on the paywall until this is done, then **Redeploy**.

1. Open the Stackless project on [Vercel](https://vercel.com).
2. **Settings** → **Environment Variables**. Add all four, for **Production**, **Preview**, and **Development**:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_PRICE_ID`
3. Never prefix the secret key or webhook secret with `NEXT_PUBLIC_`.
4. Confirm the webhook URL in Stripe is the **production** site: `https://www.stackless.lol/api/stripe/webhook`.
5. **Deployments** → latest → **⋯** → **Redeploy**.

After that: sign in → `/app` → **Subscribe — $19/month** → Stripe Checkout. Webhook marks the Clerk user `subscriptionStatus: "active"`. **Billing** on `/app` and `/account` opens the Customer Portal.

Checkout, Portal, and the webhook import the `stripe` package on the server only (`lib/stripe/client.ts`, `app/api/stripe/webhook/route.ts`, `app/app/billing-actions.ts`).

### Resend (required to actually send)

The site still **builds** without these. Send email will say **Add RESEND_API_KEY** until you paste a real key (no sample secrets).

1. Make an account at [resend.com](https://resend.com).
2. Open [API Keys](https://resend.com/api-keys) → **Create API Key** → copy it.
3. Put it in `.env.local` as `RESEND_API_KEY=`.
4. Set `RESEND_FROM_EMAIL`:
   - **Testing:** `Stackless <onboarding@resend.dev>` — Resend’s onboarding address. It can only send **to the email on your Resend account**, not to random clients.
   - **Real client mail:** [Domains](https://resend.com/domains) → add your domain → add the DNS records they show → wait until it says verified. Then use an address on that domain, like `Stackless <hello@yourdomain.com>`.
5. Restart `npm run dev`. Tap **Send** on `/app`, confirm, and check the inbox (or Resend’s **Emails** log).
6. On Vercel: **Settings** → **Environment Variables** → add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for Production / Preview / Development → **Redeploy**.

The send path is server-only (`sendNudgeAction` in `app/app/actions.ts` and `deliverNudgeDraft` in `lib/email/deliver.ts`). The `resend` package is never imported from a client component. Cron reuses that same path.

### Vercel Cron (required to send later)

The site still **builds** without `CRON_SECRET`. The daily job will not send until this is set, and random hits to `/api/cron/send-due-nudges` get **401**.

1. Generate a long random secret, e.g. `openssl rand -hex 32`.
2. Vercel → **Settings** → **Environment Variables** → add `CRON_SECRET` for **Production** (Preview does not run Vercel Cron). Never `NEXT_PUBLIC_`.
3. Confirm **Resend** env is already set: `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (same as Send email). From `hello@stackless.lol` is already working.
4. Confirm **Cron Jobs** are enabled on the Vercel plan. **Hobby = daily** (`0 15 * * *` in `vercel.json` — 15:00 UTC ≈ 8am PT). An hourly expression **fails the Hobby deploy**. **Pro** can bump `vercel.json` to hourly later.
5. For Production persistence, set `STACKLESS_DATA_STORE=neon` and `DATABASE_URL` (steps below). Memory store on Vercel is per-instance and will not keep drafts for cron. Sheets still works if you already have it; Neon is the recommended path.
6. **Redeploy** so `vercel.json` crons register. Cron runs on **production** only.
7. Optional check: Vercel → project → **Cron Jobs** should list `/api/cron/send-due-nudges`.

**Failure handling:** a failed auto-send stays `draft`. The row records `last_error` and increments `send_attempts`. After **5** failures, cron skips that draft (no endless retries). Saving the draft again clears the counter. Resend’s idempotency key `nudge/<id>` also prevents a true double-send if a previous attempt was actually accepted. Already-`sent` nudges are never selected.

Neon’s `nudge_log` table includes `last_error` and `send_attempts` (see [`data/schema.sql`](data/schema.sql)). If you are still on Sheets and those columns are missing, the app still loads; retries just won’t persist the counter (the next daily run still tries; Resend idempotency still applies).

### Neon Postgres (recommended for Production)

Leave `STACKLESS_DATA_STORE=memory` for local and CI until a database is connected. The site **builds** without `DATABASE_URL`. Setting `STACKLESS_DATA_STORE=neon` (or `postgres`) without `DATABASE_URL` shows a peach error on `/app` (no sample keys).

App code still talks only to `DataStore` in `lib/data/types.ts`. `NeonDataStore` is the production implementation (`lib/data/neon-store.ts`), using `@neondatabase/serverless` over HTTP — Vercel-friendly, no Google Cloud. Each row is owned by the signed-in Clerk user id; legacy rows with a blank `user_id` stay in Postgres but are not listed, edited, or auto-sent.

#### 1. Create a free Neon project (Michael)

1. Open [https://console.neon.tech](https://console.neon.tech) and sign in (GitHub is fine).
2. **New project**. Name it `Stackless`. Pick a region close to Vercel (e.g. US East). Create.
3. On the project dashboard, open **Connect** (connection details).
4. Copy the connection string. Prefer **Pooled connection** for serverless. It looks like `postgresql://…@ep-….neon.tech/neondb?sslmode=require` — the pooled host usually includes `-pooler`.
5. Optional: **SQL Editor** → paste [`data/schema.sql`](data/schema.sql) → Run. The app also runs `CREATE TABLE IF NOT EXISTS` on first request, so this step is a backup, not required.

Do not commit the connection string.

#### 2. Local `.env.local`

```bash
STACKLESS_DATA_STORE=neon
DATABASE_URL=postgresql://…
```

`DATABASE_URL` is **server-only** — never prefix with `NEXT_PUBLIC_`. Restart `npm run dev`. `/app` should load an empty list (add a person or invoice). To go back to in-memory, set `STACKLESS_DATA_STORE=memory` again.

#### 3. Vercel env (after merge)

Preview/production stay on the in-memory store (lost between instances, cron cannot see scheduled drafts) until this is done, then **Redeploy**.

1. Open the Stackless project on [Vercel](https://vercel.com).
2. **Settings** → **Environment Variables**. Add both, for **Production**, **Preview**, and **Development**:
   - `DATABASE_URL` — the Neon connection string from step 1
   - `STACKLESS_DATA_STORE` = `neon`
3. Never prefix `DATABASE_URL` with `NEXT_PUBLIC_`.
4. **Deployments** → latest → **⋯** → **Redeploy**.

Clerk, Stripe, Resend, and cron env vars stay as they are. After redeploy, add/edit/delete, nudges, Send, Schedule, and the daily cron job use Neon.

### Google Sheets (legacy, optional)

Sheets still implements the same `DataStore` interface, but it is **not** the recommended production path. Prefer Neon above. You do **not** need Google Cloud for Stackless.

Leave `STACKLESS_DATA_STORE=memory` (or `neon`) unless you already have a Sheet. Setting `STACKLESS_DATA_STORE=sheets` without credentials shows a clear error on `/app` (no sample keys).

When you want a Sheet anyway:

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
