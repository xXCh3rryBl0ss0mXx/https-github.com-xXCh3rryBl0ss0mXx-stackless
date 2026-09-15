"use client";

import { Show, SignUpButton, UserButton, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import type { ReactNode } from "react";
import { isClerkConfigured } from "@/lib/clerk";

const WAITLIST_AFTER_JOIN = "/waitlist?joined=1";

function WaitlistTrigger({
  className,
  children,
  id,
}: {
  className: string;
  children: ReactNode;
  id?: string;
}) {
  const clerk = useClerk();

  return (
    <button
      id={id}
      type="button"
      className={className}
      onClick={() => {
        clerk.openWaitlist({ afterJoinWaitlistUrl: WAITLIST_AFTER_JOIN });
      }}
    >
      {children}
    </button>
  );
}

function ClerkHeaderCta({ className }: { className: string }) {
  return (
    <Show
      when="signed-in"
      fallback={
        <SignUpButton mode="modal" forceRedirectUrl={WAITLIST_AFTER_JOIN}>
          <button type="button" className={className}>
            Sign Up
          </button>
        </SignUpButton>
      }
    >
      <UserButton />
    </Show>
  );
}

export function LandingHeaderCta({ className }: { className: string }) {
  if (!isClerkConfigured()) {
    return (
      <Link className={className} href="/sign-up">
        Sign Up
      </Link>
    );
  }

  return <ClerkHeaderCta className={className} />;
}

export function EarlyAccessButton({
  className,
  id,
}: {
  className: string;
  id?: string;
}) {
  if (!isClerkConfigured()) {
    return (
      <Link id={id} className={className} href="/waitlist">
        Get early access
      </Link>
    );
  }

  return (
    <WaitlistTrigger className={className} id={id}>
      Get early access
    </WaitlistTrigger>
  );
}
