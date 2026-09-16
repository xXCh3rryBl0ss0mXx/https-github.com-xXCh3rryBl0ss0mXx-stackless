export {};

declare global {
  interface UserPublicMetadata {
    stripeCustomerId?: string;
    subscriptionStatus?: string;
  }

  interface UserPrivateMetadata {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string | null;
  }
}
