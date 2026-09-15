import { auth } from "@clerk/nextjs/server";
import { APP_PATH, peachSignInUrl } from "@/lib/clerk-paths";
import { isClerkConfigured } from "@/lib/clerk";

/** No-op when Clerk keys are missing so local/CI still render `/app`. */
export async function requireSignedIn() {
  if (!isClerkConfigured()) return;
  await auth.protect({
    unauthenticatedUrl: peachSignInUrl(APP_PATH),
  });
}
