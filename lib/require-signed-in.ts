import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { APP_PATH, peachSignInUrl } from "@/lib/clerk-paths";
import { isClerkConfigured } from "@/lib/clerk";

async function pageReturnUrl(path: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return path;
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}${path}`;
}

/** No-op when Clerk keys are missing so local/CI still render gated pages. */
export async function requireSignedIn(returnTo: string = APP_PATH) {
  if (!isClerkConfigured()) return;
  await auth.protect({
    unauthenticatedUrl: peachSignInUrl(await pageReturnUrl(returnTo)),
  });
}
