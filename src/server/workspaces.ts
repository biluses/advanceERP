import { and, eq } from "drizzle-orm";

import { db, schema } from "@/db/client";
import { slugify } from "@/domain/brand";
import { getPlan } from "@/domain/plans";

import { newId } from "./ids";

/** Everything a new account needs to start working: a workspace, its brand
    kit and the trial credits. Runs inside the sign-up transaction hook. */
export async function bootstrapWorkspace(owner: { id: string; name: string; email: string }): Promise<string> {
  const now = new Date();
  const id = newId();
  const base = slugify(owner.name || owner.email.split("@")[0] || "workspace", "workspace");
  const slug = `${base}-${id.slice(0, 6)}`;
  const trial = getPlan("free").credits;
  await db.batch([
    db.insert(schema.workspace).values({
      id,
      name: owner.name ? `${owner.name}'s brand` : "My brand",
      slug,
      ownerId: owner.id,
      planId: "free",
      creditBalance: trial,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(schema.membership).values({ workspaceId: id, userId: owner.id, role: "owner", createdAt: now }),
    db.insert(schema.brandKit).values({ workspaceId: id, updatedAt: now }),
    db.insert(schema.creditLedger).values({
      id: newId(),
      workspaceId: id,
      delta: trial,
      reason: "trial",
      note: "Welcome credits",
      createdAt: now,
    }),
  ]);
  return id;
}

/** The workspace a user works in. Memberships are one-per-user today; the
    table shape allows more, and the first one by creation wins. */
export async function workspaceForUser(userId: string) {
  const rows = await db
    .select({ workspace: schema.workspace, role: schema.membership.role })
    .from(schema.membership)
    .innerJoin(schema.workspace, eq(schema.membership.workspaceId, schema.workspace.id))
    .where(eq(schema.membership.userId, userId))
    .orderBy(schema.membership.createdAt)
    .limit(1);
  const row = rows[0];
  if (row) return row;
  /* An account that predates the bootstrap hook, or whose hook failed, still
     deserves a workspace rather than a dead end. */
  const id = await bootstrapWorkspace({ id: userId, name: "", email: "" });
  const [created] = await db.select().from(schema.workspace).where(eq(schema.workspace.id, id));
  return { workspace: created!, role: "owner" as const };
}

export async function isMember(workspaceId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ userId: schema.membership.userId })
    .from(schema.membership)
    .where(and(eq(schema.membership.workspaceId, workspaceId), eq(schema.membership.userId, userId)))
    .limit(1);
  return rows.length > 0;
}
