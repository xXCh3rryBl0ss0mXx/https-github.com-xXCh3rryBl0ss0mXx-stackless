import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { APP_PATH, peachSignInUrl } from "@/lib/clerk-paths";
import { isClerkConfigured } from "@/lib/clerk";

async function appReturnUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return APP_PATH;
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}${APP_PATH}`;
}

/** No-op when Clerk keys are missing so local/CI still render `/app`. */
export async function requireSignedIn() {
  if (!isClerkConfigured()) return;
  await auth.protect({
    unauthenticatedUrl: peachSignInUrl(await appReturnUrl()),
  });
}
