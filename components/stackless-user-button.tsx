"use client";

import { UserButton } from "@clerk/nextjs";
import { CLERK_USER_PROFILE_PATH } from "@/lib/clerk-paths";

/** Profile menu stays Manage account + Sign out; Manage account opens `/account`. */
export function StacklessUserButton() {
  return (
    <UserButton
      userProfileMode="navigation"
      userProfileUrl={CLERK_USER_PROFILE_PATH}
    />
  );
}
