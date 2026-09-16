import "./clerk-types";
import { readStripeCheckoutConfig } from "./config";

export const CLERK_USER_ID_META = "clerkUserId";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type BillingPatch = {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  subscriptionStatus: string;
};

export type BillingKind = "open" | "unsigned" | "active" | "inactive" | "setup";

export type BillingState = {
  kind: BillingKind;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  message?: string;
  canCheckout: boolean;
  canManageBilling: boolean;
};

export function normalizeSubscriptionStatus(
  status: string | null | undefined,
): string {
  return (status ?? "").trim().toLowerCase();
}

/**
 * Paid access for `/app` and Send.
 * `past_due` still gets in so they can open the portal and fix the card.
 */
export function isActiveSubscriptionStatus(
  status: string | null | undefined,
): boolean {
  const normalized = normalizeSubscriptionStatus(status);
  return (
    normalized === "active" ||
    normalized === "trialing" ||
    normalized === "past_due"
  );
}

export function stripeCustomerIdFromMetadata(user: {
  publicMetadata?: object | null;
  privateMetadata?: object | null;
}): string | undefined {
  const privateId = metadataString(asMeta(user.privateMetadata), "stripeCustomerId");
  if (privateId) return privateId;
  return metadataString(asMeta(user.publicMetadata), "stripeCustomerId");
}

export function subscriptionStatusFromMetadata(user: {
  publicMetadata?: object | null;
}): string | undefined {
  return metadataString(asMeta(user.publicMetadata), "subscriptionStatus");
}

function asMeta(meta: object | null | undefined): Record<string, unknown> | null {
  if (!meta) return null;
  return meta as Record<string, unknown>;
}

function metadataString(
  meta: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined {
  const value = meta?.[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function billingStateFromInput(input: {
  clerkConfigured: boolean;
  signedIn: boolean;
  stripeReady: boolean;
  stripeSetupMessage: string;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
}): BillingState {
  if (!input.clerkConfigured) {
    return { kind: "open", canCheckout: false, canManageBilling: false };
  }
  if (!input.signedIn) {
    return { kind: "unsigned", canCheckout: false, canManageBilling: false };
  }

  const subscriptionStatus = input.subscriptionStatus;
  const stripeCustomerId = input.stripeCustomerId;

  if (isActiveSubscriptionStatus(subscriptionStatus)) {
    return {
      kind: "active",
      subscriptionStatus,
      stripeCustomerId,
      canCheckout: false,
      canManageBilling: Boolean(stripeCustomerId) && input.stripeReady,
    };
  }

  if (!input.stripeReady) {
    return {
      kind: "setup",
      subscriptionStatus,
      stripeCustomerId,
      message: input.stripeSetupMessage,
      canCheckout: false,
      canManageBilling: false,
    };
  }

  return {
    kind: "inactive",
    subscriptionStatus,
    stripeCustomerId,
    canCheckout: true,
    canManageBilling: Boolean(stripeCustomerId),
  };
}

export function billingStateFromUser(
  user: {
    publicMetadata?: object | null;
    privateMetadata?: object | null;
  } | null,
  options: { clerkConfigured: boolean; env?: NodeJS.Dict<string> },
): BillingState {
  const env = options.env ?? process.env;
  const checkout = readStripeCheckoutConfig(env);
  return billingStateFromInput({
    clerkConfigured: options.clerkConfigured,
    signedIn: Boolean(user),
    stripeReady: checkout.ok,
    stripeSetupMessage: checkout.ok ? "" : checkout.error,
    subscriptionStatus: user ? subscriptionStatusFromMetadata(user) : undefined,
    stripeCustomerId: user ? stripeCustomerIdFromMetadata(user) : undefined,
  });
}
