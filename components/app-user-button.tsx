"use client";

import { StacklessUserButton } from "@/components/stackless-user-button";
import { isClerkConfigured } from "@/lib/clerk";

export function AppUserButton() {
  if (!isClerkConfigured()) return null;
  return <StacklessUserButton />;
}
