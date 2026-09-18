import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "vitrina-test-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;

const { db, schema, dbClient } = await import("@/db/client");
const { runMigrations } = await import("@/db/migrate");
const { bootstrapWorkspace } = await import("@/server/workspaces");
const { InsufficientCreditsError, creditBalance, grantCredits, refundCredits, reserveCredits } = await import(
  "@/server/credits"
);
const { seal, unseal } = await import("@/server/seal");

let workspaceId = "";

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

describe("credits ledger", () => {
  it("starts with the trial grant and reserves atomically", async () => {
    expect(await creditBalance(workspaceId)).toBe(30);
    await reserveCredits(workspaceId, 10, "req-1");
    expect(await creditBalance(workspaceId)).toBe(20);
  });

  it("refuses a reservation the balance cannot cover and leaves the balance alone", async () => {
    await expect(reserveCredits(workspaceId, 25, "req-2")).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect(await creditBalance(workspaceId)).toBe(20);
  });

  it("refunds a request once and only once", async () => {
    expect(await refundCredits(workspaceId, 10, "req-1", "failed")).toBe(true);
    expect(await refundCredits(workspaceId, 10, "req-1", "failed again")).toBe(false);
    expect(await creditBalance(workspaceId)).toBe(30);
  });

  it("grants plan credits and records the ledger", async () => {
    await grantCredits(workspaceId, 500, "plan_grant", { stripeEventId: "evt_1", note: "starter" });
    expect(await creditBalance(workspaceId)).toBe(530);
    const rows = await db.select().from(schema.creditLedger);
    const sum = rows.reduce((total, row) => total + row.delta, 0);
    expect(sum).toBe(530);
  });

  it("races: only one of two concurrent reservations for the last credits wins", async () => {
    await reserveCredits(workspaceId, 525, "req-drain");
    expect(await creditBalance(workspaceId)).toBe(5);
    const results = await Promise.allSettled([
      reserveCredits(workspaceId, 5, "race-a"),
      reserveCredits(workspaceId, 5, "race-b"),
    ]);
    const won = results.filter((result) => result.status === "fulfilled").length;
    expect(won).toBe(1);
    expect(await creditBalance(workspaceId)).toBe(0);
  });
});

describe("seal", () => {
  it("round-trips and rejects tampering", () => {
    const sealed = seal("abc:secret");
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(unseal(sealed)).toBe("abc:secret");
    expect(unseal(`${sealed.slice(0, -2)}xx`)).toBeNull();
    expect(unseal("garbage")).toBeNull();
  });
});
