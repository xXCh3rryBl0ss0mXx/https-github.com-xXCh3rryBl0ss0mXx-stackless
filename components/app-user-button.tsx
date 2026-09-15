"use client";

import { UserButton } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk";

export function AppUserButton() {
  if (!isClerkConfigured()) return null;
  return <UserButton />;
}
