import { NextResponse } from "next/server";
import { writeClerkBilling } from "@/lib/stripe/clerk-billing";
import { getStripe, stripeLookups } from "@/lib/stripe/client";
import { readStripeWebhookConfig } from "@/lib/stripe/config";
import { applyStripeEvent } from "@/lib/stripe/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe signs this body. Keep it public (no Clerk gate) and read the raw bytes.
 * Dashboard events: checkout.session.completed, customer.subscription.updated,
 * customer.subscription.deleted.
 */
export async function POST(request: Request) {
  const config = readStripeWebhookConfig();
  if (!config.ok) {
    return NextResponse.json({ error: config.error }, { status: 503 });
  }
  if (!process.env.CLERK_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { error: "Add CLERK_SECRET_KEY so the webhook can store subscription status on the user." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe(config.secretKey);

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, config.webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const result = await applyStripeEvent(
    {
      type: event.type,
      data: { object: event.data.object as unknown as Record<string, unknown> },
    },
    {
      users: { updateUserBilling: writeClerkBilling },
      stripe: stripeLookups(stripe),
    },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}
