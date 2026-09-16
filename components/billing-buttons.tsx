"use client";

import { useActionState } from "react";
import { openPortalAction, startCheckoutAction } from "@/app/app/billing-actions";
import { PLAN_PRICE_LABEL } from "@/lib/stripe/config";

const primaryBtn =
  "cursor-pointer rounded-full border-0 bg-linear-to-br from-peach to-btn-end px-[1.35rem] py-[0.9rem] font-[inherit] font-extrabold text-btn-ink shadow-[0_8px_20px_rgba(255,143,102,0.35)] disabled:cursor-not-allowed disabled:opacity-60";

const quietBtn =
  "cursor-pointer rounded-full border border-line bg-white px-4 py-2 font-[inherit] text-[0.9rem] font-semibold text-muted no-underline disabled:cursor-not-allowed disabled:opacity-60";

export function SubscribeButton({ className = primaryBtn }: { className?: string }) {
  const [state, action, pending] = useActionState(startCheckoutAction, null);
  return (
    <form action={action} className="inline-flex flex-col items-start gap-2">
      <button className={className} disabled={pending} type="submit">
        {pending ? "Redirecting to Checkout…" : `Subscribe — ${PLAN_PRICE_LABEL}`}
      </button>
      {state?.error ? (
        <p className="max-w-[28rem] text-[0.92rem] font-semibold text-badge-fg" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function ManageBillingButton({
  className = quietBtn,
  label = "Manage billing",
}: {
  className?: string;
  label?: string;
}) {
  const [state, action, pending] = useActionState(openPortalAction, null);
  return (
    <form action={action} className="inline-flex flex-col items-start gap-2">
      <button className={className} disabled={pending} type="submit">
        {pending ? "Opening portal…" : label}
      </button>
      {state?.error ? (
        <p className="max-w-[28rem] text-[0.92rem] font-semibold text-badge-fg" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
