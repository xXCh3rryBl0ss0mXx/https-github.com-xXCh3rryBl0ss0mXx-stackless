"use server";

import { getDataStore } from "@/lib/data/store";
import { assertWaitlistCanPersist, parseWaitlistEmail } from "@/lib/data/waitlist";

export type JoinWaitlistResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

export async function joinWaitlistAction(formData: FormData): Promise<JoinWaitlistResult> {
  try {
    assertWaitlistCanPersist();
    const email = parseWaitlistEmail(String(formData.get("emailAddress") ?? ""));
    const result = await getDataStore().addWaitlistSignup(email);
    return { ok: true, created: result.created };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Couldn’t save that email. Try again.";
    return { ok: false, error: message };
  }
}
