"use client";

import { UserButton, useAuth, useClerk } from "@clerk/nextjs";
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

function TodaysListChip({ className }: { className: string }) {
  return (
    <Link className={`${className} shrink-0 whitespace-nowrap`} href="/app">
      Today’s List
    </Link>
  );
}

function SignUpChip({ className }: { className: string }) {
  return (
    <Link className={className} href="/sign-up">
      Sign Up
    </Link>
  );
}

function ClerkHeaderCta({ className }: { className: string }) {
  const { isLoaded, isSignedIn } = useAuth();

  // Sign Up only while Clerk loads or when signed out — no /app chip, no empty gap.
  if (!isLoaded || !isSignedIn) {
    return <SignUpChip className={className} />;
  }

  return (
    <div className="flex items-center gap-3">
      <TodaysListChip className={className} />
      <UserButton />
    </div>
  );
}

export function LandingHeaderCta({ className }: { className: string }) {
  if (!isClerkConfigured()) {
    return <SignUpChip className={className} />;
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
