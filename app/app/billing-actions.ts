"use server";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { APP_PATH } from "@/lib/clerk-paths";
import { requireSignedIn } from "@/lib/require-signed-in";
import { requestOrigin } from "@/lib/request-origin";
import { getBillingState } from "@/lib/stripe/billing";
import { getStripe } from "@/lib/stripe/client";
import {
  PAID_REQUIRED_MESSAGE,
  readStripeCheckoutConfig,
  readStripeSecretKey,
} from "@/lib/stripe/config";
import { CLERK_USER_ID_META, stripeCustomerIdFromMetadata } from "@/lib/stripe/subscription";

export type BillingActionState = { error: string } | null;

export async function startCheckoutAction(
  prev: BillingActionState,
  formData?: FormData,
): Promise<BillingActionState> {
  void prev;
  void formData;
  await requireSignedIn();
  const checkout = readStripeCheckoutConfig();
  if (!checkout.ok) return { error: checkout.error };

  const user = await currentUser();
  if (!user) return { error: "Sign in to subscribe." };

  const billing = await getBillingState();
  if (billing.kind === "active") {
    redirect(APP_PATH);
  }

  const origin = await requestOrigin();
  if (!origin) return { error: "Couldn’t figure out this site’s URL for Checkout." };

  const email = user.primaryEmailAddress?.emailAddress;
  const customerId = stripeCustomerIdFromMetadata(user);

  try {
    const stripe = getStripe(checkout.secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: checkout.priceId, quantity: 1 }],
      success_url: `${origin}${APP_PATH}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${APP_PATH}?checkout=canceled`,
      client_reference_id: user.id,
      metadata: { [CLERK_USER_ID_META]: user.id },
      subscription_data: {
        metadata: { [CLERK_USER_ID_META]: user.id },
      },
      ...(customerId ? { customer: customerId } : email ? { customer_email: email } : {}),
    });
    if (!session.url) return { error: "Stripe didn’t return a checkout URL." };
    redirect(session.url);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    const message = err instanceof Error ? err.message : "Checkout didn’t start.";
    return { error: message };
  }
}

export async function openPortalAction(
  prev: BillingActionState,
  formData?: FormData,
): Promise<BillingActionState> {
  void prev;
  void formData;
  await requireSignedIn();
  const secret = readStripeSecretKey();
  if (!secret.ok) return { error: secret.error };

  const user = await currentUser();
  if (!user) return { error: "Sign in to manage billing." };

  const customerId = stripeCustomerIdFromMetadata(user);
  if (!customerId) {
    return { error: PAID_REQUIRED_MESSAGE };
  }

  const origin = await requestOrigin();
  if (!origin) return { error: "Couldn’t figure out this site’s URL for the billing portal." };

  try {
    const stripe = getStripe(secret.secretKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}${APP_PATH}`,
    });
    if (!session.url) return { error: "Stripe didn’t return a portal URL." };
    redirect(session.url);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    const message = err instanceof Error ? err.message : "Couldn’t open billing.";
    return { error: message };
  }
}

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
