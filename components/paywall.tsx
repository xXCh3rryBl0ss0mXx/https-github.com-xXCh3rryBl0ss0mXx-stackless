import Link from "next/link";
import { ManageBillingButton, SubscribeButton } from "@/components/billing-buttons";
import { PLAN_PRICE_LABEL } from "@/lib/stripe/config";

export function Paywall({
  setupMessage,
  canCheckout,
  canManageBilling,
  checkoutStatus,
  subscriptionStatus,
}: {
  setupMessage?: string;
  canCheckout: boolean;
  canManageBilling: boolean;
  checkoutStatus?: string;
  subscriptionStatus?: string;
}) {
  const canceledCheckout = checkoutStatus === "canceled";
  const confirming = checkoutStatus === "success";
  const statusLabel = subscriptionStatus ? subscriptionStatus.replaceAll("_", " ") : "none yet";

  return (
    <main>
      <div className="mb-6">
        <div className="mb-[0.9rem] inline-block whitespace-nowrap rounded-full bg-badge-bg px-3 py-[0.3rem] text-[0.8rem] font-bold text-badge-fg">
          Subscribe
        </div>
        <h1 className="mb-2 text-[clamp(1.7rem,4vw,2.2rem)] leading-[1.15] font-bold tracking-[-0.03em]">
          Unlock Today’s List
        </h1>
        <p className="max-w-[40rem] text-muted">
          Stackless is {PLAN_PRICE_LABEL} — follow-ups, invoice nudges, and Send. Cancel anytime
          from the billing portal. Early access waitlist is still open; the workspace is for
          subscribers.
        </p>
      </div>

      <section className="rounded-[28px] border border-line bg-card px-6 py-8 shadow-[0_18px_40px_rgba(80,50,20,0.06)]">
        {confirming ? (
          <p className="mb-4 rounded-[20px] border border-mint bg-follow-bg p-[1.15rem] font-semibold text-follow-fg">
            Thanks — confirming your subscription. If this page doesn’t unlock in a few seconds,
            refresh.
          </p>
        ) : null}
        {canceledCheckout ? (
          <p className="mb-4 rounded-[20px] border border-peach bg-badge-bg p-[1.15rem] font-semibold text-badge-fg">
            Checkout was canceled. You can subscribe whenever you’re ready.
          </p>
        ) : null}

        <p className="mb-4 text-[0.95rem] text-muted">
          Current status: <strong className="text-ink">{statusLabel}</strong>
        </p>

        {canCheckout ? (
          <SubscribeButton />
        ) : (
          <p
            role="alert"
            className="rounded-[20px] border border-peach bg-badge-bg p-[1.15rem] font-semibold text-badge-fg"
          >
            {setupMessage ?? "Checkout isn’t connected yet."}
          </p>
        )}

        {canManageBilling ? (
          <div className="mt-4">
            <ManageBillingButton label="Update payment method" />
          </div>
        ) : null}

        <p className="mt-6 text-[0.95rem] text-muted">
          Still waiting on a spot?{" "}
          <Link className="font-semibold text-logo-accent" href="/waitlist">
            Get early access
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

export function PastDueBanner() {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-[20px] border border-peach bg-badge-bg p-[1.15rem] min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
      <p className="font-semibold text-badge-fg">
        Payment didn’t go through. Update your card to keep Stackless on.
      </p>
      <ManageBillingButton label="Update card" />
    </div>
  );
}
