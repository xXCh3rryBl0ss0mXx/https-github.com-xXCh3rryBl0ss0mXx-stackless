"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { StacklessUserButton } from "@/components/stackless-user-button";
import { isClerkConfigured } from "@/lib/clerk";
import { CLERK_SIGN_IN_PATH, CLERK_SIGN_UP_PATH } from "@/lib/clerk-paths";

function TodaysListChip({ className }: { className: string }) {
  return (
    <Link className={`${className} shrink-0 whitespace-nowrap`} href="/app">
      Today’s List
    </Link>
  );
}

function SignInChip({ className }: { className: string }) {
  return (
    <Link className={`${className} shrink-0`} href={CLERK_SIGN_IN_PATH}>
      Sign In
    </Link>
  );
}

function SignUpChip({ className }: { className: string }) {
  return (
    <Link className={`${className} shrink-0`} href={CLERK_SIGN_UP_PATH}>
      Sign Up
    </Link>
  );
}

/** Outline Sign In immediately left of primary Sign Up. Hidden once signed in. */
function SignedOutHeaderCtas({
  className,
  signUpClassName,
}: {
  className: string;
  signUpClassName: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <SignInChip className={className} />
      <SignUpChip className={signUpClassName} />
    </div>
  );
}

function ClerkHeaderCta({
  className,
  signUpClassName,
}: {
  className: string;
  signUpClassName: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();

  // Sign In + Sign Up while Clerk loads or when signed out — no /app chip, no empty gap.
  if (!isLoaded || !isSignedIn) {
    return (
      <SignedOutHeaderCtas
        className={className}
        signUpClassName={signUpClassName}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <TodaysListChip className={className} />
      <StacklessUserButton />
    </div>
  );
}

export function LandingHeaderCta({
  className,
  signUpClassName,
}: {
  className: string;
  signUpClassName: string;
}) {
  if (!isClerkConfigured()) {
    return (
      <SignedOutHeaderCtas
        className={className}
        signUpClassName={signUpClassName}
      />
    );
  }

  return (
    <ClerkHeaderCta className={className} signUpClassName={signUpClassName} />
  );
}

export function EarlyAccessButton({
  className,
  id,
}: {
  className: string;
  id?: string;
}) {
  return (
    <Link id={id} className={className} href="/waitlist">
      Get early access
    </Link>
  );
}
