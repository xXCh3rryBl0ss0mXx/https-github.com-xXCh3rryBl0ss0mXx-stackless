import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { CLERK_SIGN_IN_PATH, CLERK_SIGN_UP_PATH } from "@/lib/clerk-paths";

// Next.js 16 uses proxy.ts for the same job as middleware.ts on older Next.
// Public marketing pages stay public; this only wires Clerk when keys exist
// so `npm run build` still works in CI without secrets.
// `/api/stripe/webhook` stays unauthenticated — Stripe signs the body.
//
// Always pass local sign-in/up paths. Without them, auth.protect() sends
// unsigned `/app` visitors to Clerk’s hosted Account Portal (black UI).
const hasPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_") ?? false;

export default hasPublishableKey
  ? clerkMiddleware({
      signInUrl: CLERK_SIGN_IN_PATH,
      signUpUrl: CLERK_SIGN_UP_PATH,
    })
  : function passThrough() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
    "/__clerk/:path*",
  ],
};
