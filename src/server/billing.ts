import { eq } from "drizzle-orm";
import Stripe from "stripe";

import { db, schema } from "@/db/client";
import { getPlan, isPlanId, type PlanId } from "@/domain/plans";

import { grantCredits } from "./credits";

/** Stripe is optional: a self-hosted studio with no key simply shows no
    checkout. Everything here degrades to "billing is not configured". */
export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-08-27.dahlia" as Stripe.LatestApiVersion });
}

export function billingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Price ids live in the environment so test and live mode share the plan
    table: STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_STUDIO. */
export function priceIdFor(planId: PlanId): string | null {
  const value = process.env[`STRIPE_PRICE_${planId.toUpperCase()}`]?.trim();
  return value || null;
}

export function planForPrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const plan of ["starter", "pro", "studio"] as const) {
    if (priceIdFor(plan) === priceId) return plan;
  }
  return null;
}

export async function ensureCustomer(stripe: Stripe, workspace: schema.Workspace, email: string): Promise<string> {
  if (workspace.stripeCustomerId) return workspace.stripeCustomerId;
  const customer = await stripe.customers.create({
    email,
    name: workspace.name,
    metadata: { workspaceId: workspace.id },
  });
  await db
    .update(schema.workspace)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(schema.workspace.id, workspace.id));
  return customer.id;
}

async function workspaceByCustomer(customerId: string): Promise<schema.Workspace | null> {
  const [row] = await db.select().from(schema.workspace).where(eq(schema.workspace.stripeCustomerId, customerId));
  return row ?? null;
}

function customerIdOf(value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** Applies one Stripe event to the workspace it concerns. Returns what it
    did, for the log. Each event id is recorded first, so a redelivery is a
    no-op even if the handler below throws halfway on the first try. */
export async function applyStripeEvent(event: Stripe.Event): Promise<string> {
  const now = new Date();
  try {
    await db.insert(schema.stripeEvent).values({ id: event.id, type: event.type, processedAt: now });
  } catch {
    return "duplicate";
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const workspaceId = session.metadata?.workspaceId;
      const planId = session.metadata?.planId;
      if (!workspaceId || !planId || !isPlanId(planId)) return "ignored: no workspace or plan in metadata";
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);
      await db
        .update(schema.workspace)
        .set({
          planId,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerIdOf(session.customer) ?? undefined,
          updatedAt: now,
        })
        .where(eq(schema.workspace.id, workspaceId));
      await grantCredits(workspaceId, getPlan(planId).credits, "plan_grant", {
        stripeEventId: event.id,
        note: `${getPlan(planId).label} activated`,
      });
      return `activated ${planId} for ${workspaceId}`;
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      /* The first invoice is the checkout; credits for it come from the
         session above. Only renewals grant here. */
      if (invoice.billing_reason !== "subscription_cycle") return "ignored: not a renewal";
      const customerId = customerIdOf(invoice.customer);
      const workspace = customerId ? await workspaceByCustomer(customerId) : null;
      if (!workspace) return "ignored: unknown customer";
      const plan = getPlan(workspace.planId);
      const periodEnd = invoice.lines.data[0]?.period?.end;
      await db
        .update(schema.workspace)
        .set({ planRenewsAt: periodEnd ? new Date(periodEnd * 1000) : null, updatedAt: now })
        .where(eq(schema.workspace.id, workspace.id));
      await grantCredits(workspace.id, plan.credits, "plan_grant", { stripeEventId: event.id, note: `${plan.label} renewal` });
      return `renewed ${plan.id} for ${workspace.id}`;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId = customerIdOf(subscription.customer);
      const workspace = customerId ? await workspaceByCustomer(customerId) : null;
      if (!workspace) return "ignored: unknown customer";
      const planId = planForPrice(subscription.items.data[0]?.price?.id);
      const renews = subscription.items.data[0]?.current_period_end;
      await db
        .update(schema.workspace)
        .set({
          ...(planId && subscription.status === "active" ? { planId } : {}),
          stripeSubscriptionId: subscription.id,
          planRenewsAt: renews ? new Date(renews * 1000) : null,
          updatedAt: now,
        })
        .where(eq(schema.workspace.id, workspace.id));
      return `updated subscription for ${workspace.id}`;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = customerIdOf(subscription.customer);
      const workspace = customerId ? await workspaceByCustomer(customerId) : null;
      if (!workspace) return "ignored: unknown customer";
      await db
        .update(schema.workspace)
        .set({ planId: "free", stripeSubscriptionId: null, planRenewsAt: null, updatedAt: now })
        .where(eq(schema.workspace.id, workspace.id));
      return `downgraded ${workspace.id} to free`;
    }
    default:
      return `ignored: ${event.type}`;
  }
}
