export const PLAN_PRICE_LABEL = "$19/month";

export const MISSING_SECRET_KEY =
  "Add STRIPE_SECRET_KEY to take payments. Copy .env.example to .env.local and paste the secret key from Stripe Dashboard → Developers → API keys. Never put this in the browser.";

export const MISSING_PRICE_ID =
  "Add STRIPE_PRICE_ID for the $19/month plan. In Stripe Dashboard, create a Product with a recurring monthly Price of $19 USD, then paste the Price id (starts with price_).";

export const MISSING_WEBHOOK_SECRET =
  "Add STRIPE_WEBHOOK_SECRET so Stripe can tell us when someone subscribes. Stripe Dashboard → Developers → Webhooks → the endpoint’s Signing secret.";

export const PAID_REQUIRED_MESSAGE =
  "Subscribe to Stackless ($19/month) to use Today’s List and send email.";

function readEnv(env: NodeJS.Dict<string>, name: string): string {
  return env[name]?.trim() ?? "";
}

export type StripeSecretConfig =
  | { ok: true; secretKey: string }
  | { ok: false; error: string };

export function readStripeSecretKey(
  env: NodeJS.Dict<string> = process.env,
): StripeSecretConfig {
  const secretKey = readEnv(env, "STRIPE_SECRET_KEY");
  if (!secretKey) {
    return { ok: false, error: MISSING_SECRET_KEY };
  }
  return { ok: true, secretKey };
}

export type StripeCheckoutConfig =
  | { ok: true; secretKey: string; priceId: string }
  | { ok: false; error: string };

/** Secret key + Price id. Safe to call at request time — never required to build. */
export function readStripeCheckoutConfig(
  env: NodeJS.Dict<string> = process.env,
): StripeCheckoutConfig {
  const secret = readStripeSecretKey(env);
  if (!secret.ok) return secret;
  const priceId = readEnv(env, "STRIPE_PRICE_ID");
  if (!priceId) {
    return { ok: false, error: MISSING_PRICE_ID };
  }
  return { ok: true, secretKey: secret.secretKey, priceId };
}

export type StripeWebhookConfig =
  | { ok: true; secretKey: string; webhookSecret: string }
  | { ok: false; error: string };

export function readStripeWebhookConfig(
  env: NodeJS.Dict<string> = process.env,
): StripeWebhookConfig {
  const secret = readStripeSecretKey(env);
  if (!secret.ok) return secret;
  const webhookSecret = readEnv(env, "STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return { ok: false, error: MISSING_WEBHOOK_SECRET };
  }
  return { ok: true, secretKey: secret.secretKey, webhookSecret };
}

export function isStripeCheckoutConfigured(
  env: NodeJS.Dict<string> = process.env,
): boolean {
  return readStripeCheckoutConfig(env).ok;
}

/** Publishable key is optional for hosted Checkout; kept so the client never sees secrets. */
export function isStripePublishableConfigured(
  env: NodeJS.Dict<string> = process.env,
): boolean {
  return readEnv(env, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY").startsWith("pk_");
}
