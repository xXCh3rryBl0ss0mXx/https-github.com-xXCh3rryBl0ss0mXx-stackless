import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/auth";
import { sendDueNudges } from "@/lib/cron/send-due-nudges";
import { getDataStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron (hourly) — Authorization: Bearer CRON_SECRET.
 * Builds without Resend/Google/Clerk keys; sends fail closed until those are set.
 */
export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await sendDueNudges(getDataStore(), new Date());
  return NextResponse.json(result);
}
