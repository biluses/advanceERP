import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "vitrina-team-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;

const { db, schema, dbClient } = await import("@/db/client");
const { runMigrations } = await import("@/db/migrate");
const { eq } = await import("drizzle-orm");
const { acceptInvite, bootstrapWorkspace, createInvite, InviteError, listMembers, removeMember, seatsUsed, workspaceForUser, workspacesForUser } =
  await import("@/server/workspaces");

let workspaceId = "";

beforeAll(async () => {
  await runMigrations();
  const now = new Date();
  for (const id of ["owner", "bob", "cara"]) {
    await db.insert(schema.user).values({ id, name: id, email: `${id}@example.com`, createdAt: now, updatedAt: now });
  }
  workspaceId = await bootstrapWorkspace({ id: "owner", name: "Owner", email: "owner@example.com" });
  /* Bob has his own workspace too, so joining another must not lose it. */
  await bootstrapWorkspace({ id: "bob", name: "Bob", email: "bob@example.com" });
});

afterAll(() => {
  dbClient.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("invites and seats", () => {
  it("refuses unknown tokens", async () => {
    await expect(acceptInvite("nope", "bob")).rejects.toBeInstanceOf(InviteError);
  });

  it("seats a member on the free plan's single seat only after an upgrade", async () => {
    const invite = await createInvite(workspaceId, "owner", "editor");
    await expect(acceptInvite(invite.token, "bob")).rejects.toMatchObject({ code: "full" });
    await db.update(schema.workspace).set({ planId: "starter" }).where(eq(schema.workspace.id, workspaceId));
    expect(await acceptInvite(invite.token, "bob")).toBe(workspaceId);
    expect(await seatsUsed(workspaceId)).toBe(2);
    const members = await listMembers(workspaceId);
    expect(members.map((member) => member.userId)).toEqual(["owner", "bob"]);
  });

  it("spends a token once", async () => {
    const [row] = await db.select().from(schema.invite).where(eq(schema.invite.workspaceId, workspaceId));
    await expect(acceptInvite(row!.token, "cara")).rejects.toMatchObject({ code: "expired" });
  });

  it("keeps a member's own workspace first and honours a preferred one", async () => {
    const mine = await workspaceForUser("bob");
    expect(mine.role).toBe("owner");
    expect(mine.workspace.id).not.toBe(workspaceId);
    const preferred = await workspaceForUser("bob", workspaceId);
    expect(preferred.workspace.id).toBe(workspaceId);
    expect(preferred.role).toBe("editor");
    expect((await workspacesForUser("bob")).length).toBe(2);
    /* A preference for a workspace bob is not in falls back quietly. */
    expect((await workspaceForUser("bob", "not-a-workspace")).workspace.id).toBe(mine.workspace.id);
  });

  it("never removes the owner", async () => {
    await expect(removeMember(workspaceId, "owner")).rejects.toThrow(/owner/);
    await removeMember(workspaceId, "bob");
    expect(await seatsUsed(workspaceId)).toBe(1);
  });

  it("opens a second workspace without a second trial", async () => {
    const id = await bootstrapWorkspace({ id: "owner", name: "Owner", email: "owner@example.com" }, { name: "Second brand", trial: false });
    const [row] = await db.select().from(schema.workspace).where(eq(schema.workspace.id, id));
    expect(row!.name).toBe("Second brand");
    expect(row!.creditBalance).toBe(0);
  });
});
