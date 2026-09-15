import type { Metadata } from "next";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk";

export const metadata: Metadata = {
  title: "Sign up — Stackless",
  description: "Create your Stackless early-access account.",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="mx-auto flex w-[min(960px,calc(100%-2rem))] items-center justify-between pt-6 pb-4">
        <Link className="text-[1.3rem] font-extrabold text-ink no-underline" href="/">
          Stack<span className="text-logo-accent">less</span>
        </Link>
        <Link
          className="rounded-full border border-line bg-white px-4 py-2 text-[0.9rem] font-semibold text-muted no-underline"
          href="/"
        >
          Back home
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 pb-16 text-center">
        <div className="mb-[0.9rem] inline-block rounded-full bg-badge-bg px-3 py-[0.3rem] text-[0.8rem] font-bold text-badge-fg">
          Early access
        </div>
        <h1 className="mb-3 text-[clamp(1.7rem,4vw,2.2rem)] leading-[1.15] font-bold tracking-[-0.03em]">
          Sign up
        </h1>
        <p className="mb-6 text-muted">
          Email only. We’ll save you a spot on the Stackless list.
        </p>
        <div className="flex w-full justify-center">
          {isClerkConfigured() ? (
            <SignUp
              routing="path"
              path="/sign-up"
              fallbackRedirectUrl="/waitlist?joined=1"
              forceRedirectUrl="/waitlist?joined=1"
            />
          ) : (
            <p className="text-muted">
              Signup isn’t connected yet. Add the two Clerk keys (see the README),
              then restart the app. The Sign Up button will work after that.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
