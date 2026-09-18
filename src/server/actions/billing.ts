"use server";

import { desc, eq } from "drizzle-orm";

import { db, schema } from "@/db/client";
import { isPlanId } from "@/domain/plans";
import { billingConfigured, ensureCustomer, priceIdFor, stripeClient } from "@/server/billing";
import { requireViewer } from "@/server/session";

export type WorkspaceSummary = {
  credits: number;
  planId: string;
  planRenewsAt: number | null;
  byok: boolean;
  billing: boolean;
  hasSubscription: boolean;
};

export async function getWorkspaceSummary(): Promise<WorkspaceSummary> {
  const viewer = await requireViewer();
  return {
    credits: viewer.workspace.creditBalance,
    planId: viewer.workspace.planId,
    planRenewsAt: viewer.workspace.planRenewsAt?.getTime() ?? null,
    byok: Boolean(viewer.workspace.platformKeySealed),
    billing: billingConfigured(),
    hasSubscription: Boolean(viewer.workspace.stripeSubscriptionId),
  };
}

export type LedgerEntry = { id: string; delta: number; reason: string; note: string | null; createdAt: number };

export async function listLedger(limit = 30): Promise<LedgerEntry[]> {
  const viewer = await requireViewer();
  const rows = await db
    .select()
    .from(schema.creditLedger)
    .where(eq(schema.creditLedger.workspaceId, viewer.workspace.id))
    .orderBy(desc(schema.creditLedger.createdAt))
    .limit(limit);
  return rows.map((row) => ({ id: row.id, delta: row.delta, reason: row.reason, note: row.note, createdAt: row.createdAt.getTime() }));
}

function appUrl(): string {
  return (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

/** Sends the owner to Stripe Checkout for a plan. The workspace and plan ride
    in the session metadata, which is what the webhook keys on. */
export async function startCheckout(planId: string): Promise<{ url: string }> {
  const viewer = await requireViewer();
  if (viewer.role !== "owner") throw new Error("Only the workspace owner can change the plan");
  if (!isPlanId(planId) || planId === "free") throw new Error("Unknown plan");
  const stripe = stripeClient();
  if (!stripe) throw new Error("Billing is not configured on this studio");
  const price = priceIdFor(planId);
  if (!price) throw new Error(`No Stripe price is configured for the ${planId} plan`);
  const customer = await ensureCustomer(stripe, viewer.workspace, viewer.user.email);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl()}/app/settings?checkout=success`,
    cancel_url: `${appUrl()}/app/settings?checkout=canceled`,
    metadata: { workspaceId: viewer.workspace.id, planId },
    subscription_data: { metadata: { workspaceId: viewer.workspace.id, planId } },
    allow_promotion_codes: true,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
}

export async function openBillingPortal(): Promise<{ url: string }> {
  const viewer = await requireViewer();
  if (viewer.role !== "owner") throw new Error("Only the workspace owner can manage billing");
  const stripe = stripeClient();
  if (!stripe) throw new Error("Billing is not configured on this studio");
  if (!viewer.workspace.stripeCustomerId) throw new Error("No billing account yet — start a plan first");
  const session = await stripe.billingPortal.sessions.create({
    customer: viewer.workspace.stripeCustomerId,
    return_url: `${appUrl()}/app/settings`,
  });
  return { url: session.url };
}
