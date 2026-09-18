import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "vitrina-billing-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
process.env.STRIPE_PRICE_STARTER = "price_starter";
process.env.STRIPE_PRICE_PRO = "price_pro";

const { db, schema, dbClient } = await import("@/db/client");
const { runMigrations } = await import("@/db/migrate");
const { bootstrapWorkspace } = await import("@/server/workspaces");
const { creditBalance } = await import("@/server/credits");
const { applyStripeEvent, planForPrice } = await import("@/server/billing");
const { eq } = await import("drizzle-orm");

let workspaceId = "";

function event(id: string, type: string, object: Record<string, unknown>): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

beforeAll(async () => {
  await runMigrations();
  const now = new Date();
  await db.insert(schema.user).values({ id: "u1", name: "Ada", email: "ada@example.com", createdAt: now, updatedAt: now });
  workspaceId = await bootstrapWorkspace({ id: "u1", name: "Ada", email: "ada@example.com" });
});

afterAll(() => {
  dbClient.close();
  rmSync(dir, { recursive: true, force: true });
});

async function workspace() {
  const [row] = await db.select().from(schema.workspace).where(eq(schema.workspace.id, workspaceId));
  return row!;
}

describe("applyStripeEvent", () => {
  it("activates a plan on checkout and grants its credits once", async () => {
    const checkout = event("evt_1", "checkout.session.completed", {
      customer: "cus_1",
      subscription: "sub_1",
      metadata: { workspaceId, planId: "starter" },
    });
    expect(await applyStripeEvent(checkout)).toContain("activated starter");
    expect(await applyStripeEvent(checkout)).toBe("duplicate");
    const row = await workspace();
    expect(row.planId).toBe("starter");
    expect(row.stripeCustomerId).toBe("cus_1");
    expect(row.stripeSubscriptionId).toBe("sub_1");
    expect(await creditBalance(workspaceId)).toBe(30 + 500);
  });

  it("grants credits on a renewal invoice but not on the first one", async () => {
    const first = event("evt_2", "invoice.paid", { customer: "cus_1", billing_reason: "subscription_create", lines: { data: [] } });
    expect(await applyStripeEvent(first)).toContain("not a renewal");
    const renewal = event("evt_3", "invoice.paid", {
      customer: "cus_1",
      billing_reason: "subscription_cycle",
      lines: { data: [{ period: { end: 1_900_000_000 } }] },
    });
    expect(await applyStripeEvent(renewal)).toContain("renewed starter");
    expect(await creditBalance(workspaceId)).toBe(1030);
    expect((await workspace()).planRenewsAt?.getTime()).toBe(1_900_000_000 * 1000);
  });

  it("follows a plan change on the subscription and downgrades on deletion", async () => {
    const updated = event("evt_4", "customer.subscription.updated", {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      items: { data: [{ price: { id: "price_pro" }, current_period_end: 1_900_100_000 }] },
    });
    expect(await applyStripeEvent(updated)).toContain("updated subscription");
    expect((await workspace()).planId).toBe("pro");

    const deleted = event("evt_5", "customer.subscription.deleted", { id: "sub_1", customer: "cus_1" });
    expect(await applyStripeEvent(deleted)).toContain("downgraded");
    const row = await workspace();
    expect(row.planId).toBe("free");
    expect(row.stripeSubscriptionId).toBeNull();
    /* Credits already granted are kept; only the renewal stops. */
    expect(await creditBalance(workspaceId)).toBe(1030);
  });

  it("ignores events for customers it does not know", async () => {
    const stray = event("evt_6", "invoice.paid", { customer: "cus_nobody", billing_reason: "subscription_cycle", lines: { data: [] } });
    expect(await applyStripeEvent(stray)).toContain("unknown customer");
  });

  it("maps configured price ids back to plans", () => {
    expect(planForPrice("price_pro")).toBe("pro");
    expect(planForPrice("price_unknown")).toBeNull();
    expect(planForPrice(undefined)).toBeNull();
  });
});
