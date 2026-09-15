import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk";

export const metadata: Metadata = {
  title: "Sign in — Stackless",
  description: "Sign in to Stackless.",
};

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-screen w-[min(960px,calc(100%-2rem))] flex-col pt-6 pb-16">
      <header className="mb-8 flex items-center justify-between">
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
      <section className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center">
        {isClerkConfigured() ? (
          <SignIn routing="path" path="/sign-in" />
        ) : (
          <p className="text-center text-muted">Sign in isn’t connected yet.</p>
        )}
      </section>
    </div>
  );
}
