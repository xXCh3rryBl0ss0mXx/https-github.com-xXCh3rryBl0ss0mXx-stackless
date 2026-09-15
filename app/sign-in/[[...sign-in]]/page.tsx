import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk";
import { APP_PATH, CLERK_SIGN_UP_PATH } from "@/lib/clerk-paths";

export const metadata: Metadata = {
  title: "Sign in — Stackless",
  description: "Sign in to Stackless.",
};

export default function SignInPage() {
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
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 pb-16">
        <div className="flex w-full justify-center">
          {isClerkConfigured() ? (
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl={CLERK_SIGN_UP_PATH}
              fallbackRedirectUrl={APP_PATH}
            />
          ) : (
            <p className="text-center text-muted">Sign in isn’t connected yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
