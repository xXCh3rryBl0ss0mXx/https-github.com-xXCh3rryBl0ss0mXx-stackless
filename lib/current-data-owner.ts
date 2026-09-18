import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk";
import { dataOwnerIdFromAuth } from "@/lib/data/owner";

export { LOCAL_DATA_OWNER_ID, dataOwnerIdFromAuth } from "@/lib/data/owner";

/** Clerk user id when keys are set; `local` only when Clerk is not configured. */
export async function currentDataOwnerId(): Promise<string> {
  if (!isClerkConfigured()) {
    return dataOwnerIdFromAuth({ clerkConfigured: false, userId: null });
  }
  const { userId } = await auth();
  try {
    return dataOwnerIdFromAuth({ clerkConfigured: true, userId });
  } catch (err) {
    if (err instanceof Error && err.message === "Missing user id.") {
      throw new Error("Sign in to continue.");
    }
    throw err;
  }
}
