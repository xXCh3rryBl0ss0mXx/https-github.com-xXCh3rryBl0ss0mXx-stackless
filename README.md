# Stackless

Marketing landing for Stackless — a quiet inbox helper for freelancers.

Early access signup uses [Clerk](https://clerk.com) **Waitlist** mode (email in, you’re on the list). Google Sheets and the product dashboard are later steps — not this.

## Local preview

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). **Get early access** goes to `/waitlist` (not email). After a successful join you’ll see **You’re on the list**.

`npm run build` works **without** Clerk keys. The peach landing still shows. Signup only actually saves an email after you add the keys below. Vercel preview/production **do** need the keys, then a redeploy.

## Clerk setup (do this once)

You click these yourself in the Clerk website. Nobody else can create the app for you.

### 1. Make a Clerk account + app

1. Open [https://dashboard.clerk.com](https://dashboard.clerk.com) and sign up (or log in).
2. Click **Create application**.
3. Name it `Stackless`.
4. You can leave the extra login buttons (Google, etc.) off for now. Email is enough.
5. Click **Create application**.

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

In this repo, copy the example file:

```bash
cp .env.example .env.local
```

Open `.env.local` and paste the two values after the `=` signs (no quotes):

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Save the file. Restart `npm run dev` if it was already running.

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
