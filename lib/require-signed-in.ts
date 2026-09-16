import { auth } from "@clerk/nextjs/server";
import { APP_PATH, peachSignInUrl } from "@/lib/clerk-paths";
import { isClerkConfigured } from "@/lib/clerk";
import { absoluteUrl } from "@/lib/request-origin";

/** No-op when Clerk keys are missing so local/CI still render gated pages. */
export async function requireSignedIn(returnTo: string = APP_PATH) {
  if (!isClerkConfigured()) return;
  await auth.protect({
    unauthenticatedUrl: peachSignInUrl(await absoluteUrl(returnTo)),
  });
}
