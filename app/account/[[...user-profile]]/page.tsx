import type { Metadata } from "next";
import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { ManageBillingButton, SubscribeButton } from "@/components/billing-buttons";
import { clerkUserProfileAppearance, isClerkConfigured } from "@/lib/clerk";
import { APP_PATH, CLERK_USER_PROFILE_PATH } from "@/lib/clerk-paths";
import { requireSignedIn } from "@/lib/require-signed-in";
import { getBillingState } from "@/lib/stripe/billing";
import { PLAN_PRICE_LABEL } from "@/lib/stripe/config";

export const metadata: Metadata = {
  title: "Your account — Stackless",
  description: "Manage your Stackless account.",
};

const chipClass =
  "rounded-full border border-line bg-white px-4 py-2 text-[0.9rem] font-semibold text-muted no-underline";

export default async function AccountPage() {
  await requireSignedIn(CLERK_USER_PROFILE_PATH);
  const billing = await getBillingState();
  const statusLabel = billing.subscriptionStatus
    ? billing.subscriptionStatus.replaceAll("_", " ")
    : "none yet";

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="mx-auto flex w-[min(960px,calc(100%-2rem))] items-center justify-between pt-6 pb-4">
        <Link className="text-[1.3rem] font-extrabold text-ink no-underline" href="/">
          Stack<span className="text-logo-accent">less</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link className={chipClass} href={APP_PATH}>
            Today’s List
          </Link>
          <Link className={chipClass} href="/">
            Back home
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-4 pb-16">
        {billing.kind !== "open" && billing.kind !== "unsigned" ? (
          <section className="mb-8 w-full rounded-[28px] border border-line bg-card px-6 py-6 shadow-[0_18px_40px_rgba(80,50,20,0.06)]">
            <div className="mb-[0.7rem] inline-block rounded-full bg-badge-bg px-3 py-[0.3rem] text-[0.8rem] font-bold text-badge-fg">
              Billing
            </div>
            <h1 className="mb-2 text-[1.35rem] font-bold tracking-[-0.02em]">
              Stackless {PLAN_PRICE_LABEL}
            </h1>
            <p className="mb-4 text-muted">
              Status: <strong className="text-ink">{statusLabel}</strong>
              {billing.kind === "active"
                ? " — cancel or update your card in the Stripe portal."
                : " — subscribe to use Today’s List and Send."}
            </p>
            {billing.canCheckout ? <SubscribeButton /> : null}
            {billing.kind === "setup" && billing.message ? (
              <p
                role="alert"
                className="rounded-[20px] border border-peach bg-badge-bg p-[1.15rem] font-semibold text-badge-fg"
              >
                {billing.message}
              </p>
            ) : null}
            {billing.canManageBilling ? (
              <div className={billing.canCheckout ? "mt-3" : undefined}>
                <ManageBillingButton />
              </div>
            ) : null}
          </section>
        ) : null}
        <div className="flex w-full justify-center">
          {isClerkConfigured() ? (
            <UserProfile
              routing="path"
              path={CLERK_USER_PROFILE_PATH}
              appearance={clerkUserProfileAppearance}
            />
          ) : (
            <p className="text-center text-muted">
              Account settings aren’t connected yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
