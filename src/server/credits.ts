import { and, eq, sql } from "drizzle-orm";

import { db, schema } from "@/db/client";

import { newId } from "./ids";

export class InsufficientCreditsError extends Error {
  readonly needed: number;
  readonly balance: number;
  constructor(needed: number, balance: number) {
    super(`Not enough credits: this run needs ${needed}, the workspace has ${balance}`);
    this.name = "InsufficientCreditsError";
    this.needed = needed;
    this.balance = balance;
  }
}

type Reason = (typeof schema.creditLedger.$inferInsert)["reason"];

/** Takes credits for a run before it is submitted. The balance check and the
    debit are one conditional UPDATE, so two submits racing for the last
    credits cannot both win. */
export async function reserveCredits(workspaceId: string, amount: number, requestKey: string): Promise<void> {
  if (amount <= 0) return;
  const now = new Date();
  const result = await db
    .update(schema.workspace)
    .set({ creditBalance: sql`${schema.workspace.creditBalance} - ${amount}`, updatedAt: now })
    .where(and(eq(schema.workspace.id, workspaceId), sql`${schema.workspace.creditBalance} >= ${amount}`));
  if (result.rowsAffected === 0) {
    const [row] = await db
      .select({ balance: schema.workspace.creditBalance })
      .from(schema.workspace)
      .where(eq(schema.workspace.id, workspaceId));
    throw new InsufficientCreditsError(amount, row?.balance ?? 0);
  }
  await db.insert(schema.creditLedger).values({
    id: newId(),
    workspaceId,
    delta: -amount,
    reason: "generation",
    requestId: requestKey,
    createdAt: now,
  });
}

/** Gives a failed run its credits back, once: the (requestId, reason) pair is
    unique in the ledger, so a second refund of the same request is refused by
    the database and the balance is left alone. */
export async function refundCredits(workspaceId: string, amount: number, requestId: string, note?: string): Promise<boolean> {
  if (amount <= 0) return false;
  const now = new Date();
  try {
    await db.insert(schema.creditLedger).values({
      id: newId(),
      workspaceId,
      delta: amount,
      reason: "refund",
      requestId,
      note,
      createdAt: now,
    });
  } catch {
    return false;
  }
  await db
    .update(schema.workspace)
    .set({ creditBalance: sql`${schema.workspace.creditBalance} + ${amount}`, updatedAt: now })
    .where(eq(schema.workspace.id, workspaceId));
  return true;
}

/** Credits arriving from a plan or a purchase. Keyed by the Stripe event so a
    redelivered webhook grants nothing twice. */
export async function grantCredits(
  workspaceId: string,
  amount: number,
  reason: Extract<Reason, "plan_grant" | "purchase" | "adjustment">,
  options: { stripeEventId?: string; note?: string } = {},
): Promise<void> {
  if (amount === 0) return;
  const now = new Date();
  await db.batch([
    db.insert(schema.creditLedger).values({
      id: newId(),
      workspaceId,
      delta: amount,
      reason,
      stripeEventId: options.stripeEventId,
      note: options.note,
      createdAt: now,
    }),
    db
      .update(schema.workspace)
      .set({ creditBalance: sql`${schema.workspace.creditBalance} + ${amount}`, updatedAt: now })
      .where(eq(schema.workspace.id, workspaceId)),
  ]);
}

export async function creditBalance(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({ balance: schema.workspace.creditBalance })
    .from(schema.workspace)
    .where(eq(schema.workspace.id, workspaceId));
  return row?.balance ?? 0;
}
