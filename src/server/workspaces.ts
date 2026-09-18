import { and, asc, eq, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";

import { db, schema } from "@/db/client";
import { slugify } from "@/domain/brand";
import { getPlan } from "@/domain/plans";

import { newId } from "./ids";

export type Role = "owner" | "editor";

export type WorkspaceMembership = { workspace: schema.Workspace; role: Role };

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** Everything a new account needs to start working: a workspace, its brand
    kit and the trial credits. Runs inside the sign-up hook, and again when
    an owner opens a second workspace (without the trial). */
export async function bootstrapWorkspace(
  owner: { id: string; name: string; email: string },
  options: { name?: string; trial?: boolean } = {},
): Promise<string> {
  const now = new Date();
  const id = newId();
  const base = slugify(options.name || owner.name || owner.email.split("@")[0] || "workspace", "workspace");
  const slug = `${base}-${id.slice(0, 6)}`;
  const trial = options.trial === false ? 0 : getPlan("free").credits;
  const name = options.name?.trim() || (owner.name ? `${owner.name}'s brand` : "My brand");
  await db.batch([
    db.insert(schema.workspace).values({
      id,
      name,
      slug,
      ownerId: owner.id,
      planId: "free",
      creditBalance: trial,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(schema.membership).values({ workspaceId: id, userId: owner.id, role: "owner", createdAt: now }),
    db.insert(schema.brandKit).values({ workspaceId: id, name: options.name?.trim() ?? "", updatedAt: now }),
    ...(trial > 0
      ? [
          db.insert(schema.creditLedger).values({
            id: newId(),
            workspaceId: id,
            delta: trial,
            reason: "trial" as const,
            note: "Welcome credits",
            createdAt: now,
          }),
        ]
      : []),
  ]);
  return id;
}

export async function workspacesForUser(userId: string): Promise<WorkspaceMembership[]> {
  const rows = await db
    .select({ workspace: schema.workspace, role: schema.membership.role })
    .from(schema.membership)
    .innerJoin(schema.workspace, eq(schema.membership.workspaceId, schema.workspace.id))
    .where(eq(schema.membership.userId, userId))
    .orderBy(asc(schema.membership.createdAt));
  return rows;
}

/** The workspace a user works in: the one they last switched to when they
    are still a member of it, else their first. An account without any
    (predating the sign-up hook, or whose hook failed) gets one made. */
export async function workspaceForUser(userId: string, preferredId?: string | null): Promise<WorkspaceMembership> {
  const memberships = await workspacesForUser(userId);
  const preferred = preferredId ? memberships.find((entry) => entry.workspace.id === preferredId) : undefined;
  if (preferred) return preferred;
  if (memberships[0]) return memberships[0];
  const id = await bootstrapWorkspace({ id: userId, name: "", email: "" });
  const [created] = await db.select().from(schema.workspace).where(eq(schema.workspace.id, id));
  return { workspace: created!, role: "owner" };
}

export async function isMember(workspaceId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ userId: schema.membership.userId })
    .from(schema.membership)
    .where(and(eq(schema.membership.workspaceId, workspaceId), eq(schema.membership.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export type Member = { userId: string; name: string; email: string; role: Role; joinedAt: number };

export async function listMembers(workspaceId: string): Promise<Member[]> {
  const rows = await db
    .select({ userId: schema.user.id, name: schema.user.name, email: schema.user.email, role: schema.membership.role, joinedAt: schema.membership.createdAt })
    .from(schema.membership)
    .innerJoin(schema.user, eq(schema.membership.userId, schema.user.id))
    .where(eq(schema.membership.workspaceId, workspaceId))
    .orderBy(asc(schema.membership.createdAt));
  return rows.map((row) => ({ ...row, joinedAt: row.joinedAt.getTime() }));
}

export async function seatsUsed(workspaceId: string): Promise<number> {
  const rows = await db.select({ userId: schema.membership.userId }).from(schema.membership).where(eq(schema.membership.workspaceId, workspaceId));
  return rows.length;
}

export type Invite = { id: string; token: string; role: Role; expiresAt: number; createdAt: number };

export async function listOpenInvites(workspaceId: string): Promise<Invite[]> {
  const rows = await db
    .select()
    .from(schema.invite)
    .where(and(eq(schema.invite.workspaceId, workspaceId), isNull(schema.invite.acceptedAt)))
    .orderBy(asc(schema.invite.createdAt));
  const now = Date.now();
  return rows
    .filter((row) => row.expiresAt.getTime() > now)
    .map((row) => ({ id: row.id, token: row.token, role: row.role, expiresAt: row.expiresAt.getTime(), createdAt: row.createdAt.getTime() }));
}

export async function createInvite(workspaceId: string, createdBy: string, role: Role): Promise<Invite> {
  const now = new Date();
  const row = {
    id: newId(),
    workspaceId,
    token: randomBytes(24).toString("base64url"),
    role,
    createdBy,
    expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    acceptedBy: null,
    acceptedAt: null,
    createdAt: now,
  };
  await db.insert(schema.invite).values(row);
  return { id: row.id, token: row.token, role, expiresAt: row.expiresAt.getTime(), createdAt: now.getTime() };
}

export async function revokeInvite(workspaceId: string, inviteId: string): Promise<void> {
  await db.delete(schema.invite).where(and(eq(schema.invite.workspaceId, workspaceId), eq(schema.invite.id, inviteId)));
}

export class InviteError extends Error {
  readonly code: "unknown" | "expired" | "full";
  constructor(code: "unknown" | "expired" | "full") {
    super(
      code === "unknown"
        ? "This invitation does not exist"
        : code === "expired"
          ? "This invitation has expired or was already used"
          : "This workspace has no seats left on its plan",
    );
    this.name = "InviteError";
    this.code = code;
  }
}

/** Joins the holder of a token to its workspace. A member already inside is
    simply switched there; the token is spent either way. */
export async function acceptInvite(token: string, userId: string): Promise<string> {
  const [row] = await db.select().from(schema.invite).where(eq(schema.invite.token, token));
  if (!row) throw new InviteError("unknown");
  if (row.acceptedAt || row.expiresAt.getTime() < Date.now()) throw new InviteError("expired");
  const now = new Date();
  if (!(await isMember(row.workspaceId, userId))) {
    const [ws] = await db.select().from(schema.workspace).where(eq(schema.workspace.id, row.workspaceId));
    if (!ws) throw new InviteError("unknown");
    if ((await seatsUsed(ws.id)) >= getPlan(ws.planId).seats) throw new InviteError("full");
    await db.insert(schema.membership).values({ workspaceId: ws.id, userId, role: row.role, createdAt: now });
  }
  await db.update(schema.invite).set({ acceptedBy: userId, acceptedAt: now }).where(eq(schema.invite.id, row.id));
  return row.workspaceId;
}

export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  const [ws] = await db.select({ ownerId: schema.workspace.ownerId }).from(schema.workspace).where(eq(schema.workspace.id, workspaceId));
  if (!ws || ws.ownerId === userId) throw new Error("The workspace owner cannot be removed");
  await db.delete(schema.membership).where(and(eq(schema.membership.workspaceId, workspaceId), eq(schema.membership.userId, userId)));
}
