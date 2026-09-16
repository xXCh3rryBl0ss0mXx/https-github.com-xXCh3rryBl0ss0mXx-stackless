import Link from "next/link";
import type { ReactNode } from "react";
import { AppUserButton } from "@/components/app-user-button";
import { ManageBillingButton } from "@/components/billing-buttons";
import { requireSignedIn } from "@/lib/require-signed-in";
import { getBillingState } from "@/lib/stripe/billing";

const chipClass =
  "rounded-full border border-line bg-white px-4 py-2 text-[0.9rem] font-semibold text-muted no-underline";

export default async function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireSignedIn();
  const billing = await getBillingState();

  return (
    <div className="mx-auto w-[min(960px,calc(100%-2rem))] pt-6 pb-12">
      <header className="mb-8 flex items-center justify-between">
        <Link className="text-[1.3rem] font-extrabold text-ink no-underline" href="/">
          Stack<span className="text-logo-accent">less</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link className={chipClass} href="/">
            Home
          </Link>
          {billing.canManageBilling ? (
            <ManageBillingButton className={chipClass} label="Billing" />
          ) : null}
          <AppUserButton />
        </div>
      </header>
      {children}
    </div>
  );
}
