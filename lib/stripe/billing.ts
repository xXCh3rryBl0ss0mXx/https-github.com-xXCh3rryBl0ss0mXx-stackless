import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk";
import { requireSignedIn } from "@/lib/require-signed-in";
import { writeClerkBilling } from "./clerk-billing";
import { getStripe, stripeLookups } from "./client";
import { PAID_REQUIRED_MESSAGE, readStripeCheckoutConfig } from "./config";
import {
  billingStateFromUser,
  isActiveSubscriptionStatus,
  type BillingState,
} from "./subscription";
import { applyCheckoutSession } from "./webhook";

export type PaidAccessResult = { ok: true } | { ok: false; error: string };

export async function getBillingState(): Promise<BillingState> {
  if (!isClerkConfigured()) {
    return billingStateFromUser(null, { clerkConfigured: false });
  }
  const user = await currentUser();
  return billingStateFromUser(user, { clerkConfigured: true });
}

export async function requirePaidAccess(): Promise<PaidAccessResult> {
  await requireSignedIn();
  const state = await getBillingState();
  if (state.kind === "open" || state.kind === "active") {
    return { ok: true };
  }
  if (state.kind === "setup") {
    return { ok: false, error: state.message ?? PAID_REQUIRED_MESSAGE };
  }
  if (state.kind === "unsigned") {
    return { ok: false, error: "Sign in to continue." };
  }
  return { ok: false, error: PAID_REQUIRED_MESSAGE };
}

export async function assertPaidAccess(): Promise<void> {
  const access = await requirePaidAccess();
  if (!access.ok) {
    throw new Error(access.error);
  }
}

/** After Checkout, confirm the session if the webhook hasn’t landed yet. */
export async function syncCheckoutSession(
  sessionId: string,
): Promise<BillingState | null> {
  const trimmed = sessionId.trim();
  if (!trimmed || !isClerkConfigured()) return null;

  const checkout = readStripeCheckoutConfig();
  if (!checkout.ok) return null;

  const user = await currentUser();
  if (!user) return null;
  if (isActiveSubscriptionStatus(user.publicMetadata.subscriptionStatus)) {
    return billingStateFromUser(user, { clerkConfigured: true });
  }

  const stripe = getStripe(checkout.secretKey);
  const session = await stripe.checkout.sessions.retrieve(trimmed, {
    expand: ["subscription"],
  });
  const result = await applyCheckoutSession(
    {
      id: session.id,
      status: session.status,
      mode: session.mode,
      client_reference_id: session.client_reference_id,
      customer: session.customer as never,
      subscription: session.subscription as never,
      metadata: session.metadata,
    },
    {
      users: { updateUserBilling: writeClerkBilling },
      stripe: stripeLookups(stripe),
    },
    { expectedUserId: user.id },
  );

  if (!result.ok || result.action !== "updated") return null;
  return billingStateFromUser(
    {
      publicMetadata: {
        stripeCustomerId: result.patch.stripeCustomerId,
        subscriptionStatus: result.patch.subscriptionStatus,
      },
      privateMetadata: {
        stripeCustomerId: result.patch.stripeCustomerId,
        stripeSubscriptionId: result.patch.stripeSubscriptionId,
      },
    },
    { clerkConfigured: true },
  );
}
