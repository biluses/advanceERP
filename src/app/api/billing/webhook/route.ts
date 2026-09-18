import { NextResponse } from "next/server";

import { applyStripeEvent, stripeClient } from "@/server/billing";

/** Stripe's webhook. The signature is checked against STRIPE_WEBHOOK_SECRET
    before anything is read; each event is applied once. */
export async function POST(request: Request): Promise<NextResponse> {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const payload = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (caught) {
    console.warn("[billing] rejected webhook", caught instanceof Error ? caught.message : caught);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const outcome = await applyStripeEvent(event);
    console.info("[billing]", event.type, outcome);
    return NextResponse.json({ received: true, outcome });
  } catch (caught) {
    console.error("[billing] failed to apply", event.type, caught instanceof Error ? caught.message : caught);
    return NextResponse.json({ error: "Failed to apply event" }, { status: 500 });
  }
}
