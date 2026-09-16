import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import type { BillingPatch } from "./subscription";

/** Merge Stripe ids + status onto the Clerk user. publicMetadata matches the product gate. */
export async function writeClerkBilling(userId: string, patch: BillingPatch): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      stripeCustomerId: patch.stripeCustomerId ?? undefined,
      subscriptionStatus: patch.subscriptionStatus,
    },
    privateMetadata: {
      stripeCustomerId: patch.stripeCustomerId ?? undefined,
      stripeSubscriptionId:
        patch.stripeSubscriptionId === undefined
          ? undefined
          : patch.stripeSubscriptionId,
    },
  });
}
