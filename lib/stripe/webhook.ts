import { CLERK_USER_ID_META, type BillingPatch } from "./subscription";

export type BillingWriter = {
  updateUserBilling(userId: string, patch: BillingPatch): Promise<void>;
};

export type StripeSubscriptionRecord = {
  id: string;
  status: string;
  customer: string | { id: string };
  metadata?: Record<string, string> | null;
};

export type StripeCustomerRecord = {
  id: string;
  deleted?: boolean;
  metadata?: Record<string, string> | null;
};

export type StripeLookups = {
  retrieveSubscription?(id: string): Promise<StripeSubscriptionRecord>;
  retrieveCustomer?(id: string): Promise<StripeCustomerRecord>;
  updateCustomerMetadata?(
    customerId: string,
    metadata: Record<string, string>,
  ): Promise<void>;
};

export type StripeEventLike = {
  type: string;
  data: { object: Record<string, unknown> };
};

export type ApplyResult =
  | { ok: true; action: "updated"; userId: string; patch: BillingPatch }
  | { ok: true; action: "ignored"; reason: string }
  | { ok: false; error: string };

export type CheckoutSessionLike = {
  id?: string;
  status?: string | null;
  mode?: string | null;
  client_reference_id?: string | null;
  customer?: string | { id: string; metadata?: Record<string, string> | null } | null;
  subscription?: string | StripeSubscriptionRecord | null;
  metadata?: Record<string, string> | null;
};

export type ApplyOptions = {
  expectedUserId?: string;
};

export function idFromExpandable(
  value: string | { id: string } | null | undefined,
): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  return value.id?.trim() || undefined;
}

export function clerkUserIdFromRecord(record: {
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
}): string | undefined {
  const fromRef = record.client_reference_id?.trim();
  if (fromRef) return fromRef;
  const fromMeta = record.metadata?.[CLERK_USER_ID_META]?.trim();
  if (fromMeta) return fromMeta;
  return undefined;
}

function clerkUserIdFromCustomer(
  customer: CheckoutSessionLike["customer"],
): string | undefined {
  if (!customer || typeof customer === "string") return undefined;
  return customer.metadata?.[CLERK_USER_ID_META]?.trim() || undefined;
}

export async function applyStripeEvent(
  event: StripeEventLike,
  deps: { users: BillingWriter; stripe?: StripeLookups },
): Promise<ApplyResult> {
  switch (event.type) {
    case "checkout.session.completed":
      return applyCheckoutSession(event.data.object as CheckoutSessionLike, deps);
    case "customer.subscription.updated":
      return applySubscription(event.data.object as StripeSubscriptionRecord, deps);
    case "customer.subscription.deleted":
      return applySubscription(event.data.object as StripeSubscriptionRecord, deps, {
        forceCanceled: true,
      });
    default:
      return { ok: true, action: "ignored", reason: `unhandled ${event.type}` };
  }
}

export async function applyCheckoutSession(
  session: CheckoutSessionLike,
  deps: { users: BillingWriter; stripe?: StripeLookups },
  options: ApplyOptions = {},
): Promise<ApplyResult> {
  if (session.status && session.status !== "complete") {
    return { ok: true, action: "ignored", reason: `checkout ${session.status}` };
  }

  let subscription: StripeSubscriptionRecord | undefined;
  const subscriptionId = idFromExpandable(session.subscription ?? undefined);
  if (session.subscription && typeof session.subscription !== "string") {
    subscription = session.subscription;
  } else if (subscriptionId && deps.stripe?.retrieveSubscription) {
    subscription = await deps.stripe.retrieveSubscription(subscriptionId);
  }

  const customerId =
    idFromExpandable(session.customer ?? undefined) ??
    (subscription ? idFromExpandable(subscription.customer) : undefined);

  let userId =
    clerkUserIdFromRecord(session) ??
    (subscription ? clerkUserIdFromRecord(subscription) : undefined) ??
    clerkUserIdFromCustomer(session.customer);

  if (!userId && customerId && deps.stripe?.retrieveCustomer) {
    const customer = await deps.stripe.retrieveCustomer(customerId);
    if (!customer.deleted) {
      userId = clerkUserIdFromRecord(customer);
    }
  }

  if (!userId) {
    return { ok: true, action: "ignored", reason: "no clerk user on checkout session" };
  }
  if (options.expectedUserId && options.expectedUserId !== userId) {
    return { ok: true, action: "ignored", reason: "checkout session belongs to another user" };
  }

  const status = subscription?.status ?? "active";
  const patch: BillingPatch = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription?.id ?? subscriptionId ?? null,
    subscriptionStatus: status,
  };

  await persistPatch(userId, patch, customerId, deps);
  return { ok: true, action: "updated", userId, patch };
}

export async function applySubscription(
  subscription: StripeSubscriptionRecord,
  deps: { users: BillingWriter; stripe?: StripeLookups },
  options: { forceCanceled?: boolean } = {},
): Promise<ApplyResult> {
  const customerId = idFromExpandable(subscription.customer);
  let userId = clerkUserIdFromRecord(subscription);

  if (!userId && customerId && deps.stripe?.retrieveCustomer) {
    const customer = await deps.stripe.retrieveCustomer(customerId);
    if (!customer.deleted) {
      userId = clerkUserIdFromRecord(customer);
    }
  }

  if (!userId) {
    return { ok: true, action: "ignored", reason: "no clerk user on subscription" };
  }

  const patch: BillingPatch = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: options.forceCanceled ? null : subscription.id,
    subscriptionStatus: options.forceCanceled ? "canceled" : subscription.status,
  };

  await persistPatch(userId, patch, customerId, deps);
  return { ok: true, action: "updated", userId, patch };
}

async function persistPatch(
  userId: string,
  patch: BillingPatch,
  customerId: string | undefined,
  deps: { users: BillingWriter; stripe?: StripeLookups },
): Promise<void> {
  await deps.users.updateUserBilling(userId, patch);
  if (customerId && deps.stripe?.updateCustomerMetadata) {
    await deps.stripe.updateCustomerMetadata(customerId, {
      [CLERK_USER_ID_META]: userId,
    });
  }
}
