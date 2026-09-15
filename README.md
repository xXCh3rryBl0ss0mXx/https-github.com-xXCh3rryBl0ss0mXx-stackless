# Stackless

Marketing landing for Stackless — a quiet inbox helper for freelancers.

Early access signup uses [Clerk](https://clerk.com) **Waitlist** mode (email in, you’re on the list). Use **email only** — no Google, no phone. Google Sheets and the product dashboard are later steps — not this.

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
- Signed in: the top-right chip becomes your Clerk profile button (UserButton).
- `/sign-up` and `/waitlist` are the same peach pages if you open them directly.

`npm run build` works **without** Clerk keys. The peach landing still shows, and the buttons go to `/waitlist`. Signup only saves an email after you add the keys. Vercel preview/production **do** need the keys, then a **Redeploy**.

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

Optional: if you install the Clerk CLI and run `npx clerk@latest auth login` in your own terminal, `npx clerk@latest env pull` can fill `.env.local` for you. Don’t commit that file.

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
