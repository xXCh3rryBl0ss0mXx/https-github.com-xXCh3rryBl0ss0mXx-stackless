import type { Metadata } from "next";
import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { clerkUserProfileAppearance, isClerkConfigured } from "@/lib/clerk";
import { APP_PATH, CLERK_USER_PROFILE_PATH } from "@/lib/clerk-paths";
import { requireSignedIn } from "@/lib/require-signed-in";

export const metadata: Metadata = {
  title: "Your account — Stackless",
  description: "Manage your Stackless account.",
};

const chipClass =
  "rounded-full border border-line bg-white px-4 py-2 text-[0.9rem] font-semibold text-muted no-underline";

export default async function AccountPage() {
  await requireSignedIn(CLERK_USER_PROFILE_PATH);

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
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 pb-16">
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
