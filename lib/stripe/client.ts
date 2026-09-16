import "server-only";

import Stripe from "stripe";
import { MISSING_SECRET_KEY, readStripeSecretKey } from "./config";

/** Server-only Stripe client. Instantiated at request time so builds work without keys. */
export function getStripe(secretKey?: string): Stripe {
  const fromArg = secretKey?.trim() ?? "";
  if (fromArg) return new Stripe(fromArg);

  const config = readStripeSecretKey();
  if (!config.ok) {
    throw new Error(MISSING_SECRET_KEY);
  }
  return new Stripe(config.secretKey);
}

export function stripeLookups(stripe: Stripe) {
  return {
    async retrieveSubscription(id: string) {
      const sub = await stripe.subscriptions.retrieve(id);
      return {
        id: sub.id,
        status: sub.status,
        customer: sub.customer,
        metadata: sub.metadata,
      };
    },
    async retrieveCustomer(id: string) {
      const customer = await stripe.customers.retrieve(id);
      if ("deleted" in customer && customer.deleted) {
        return { id: customer.id, deleted: true as const, metadata: {} };
      }
      return { id: customer.id, metadata: customer.metadata };
    },
    async updateCustomerMetadata(customerId: string, metadata: Record<string, string>) {
      await stripe.customers.update(customerId, { metadata });
    },
  };
}
