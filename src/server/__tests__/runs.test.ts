import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "vitrina-runs-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;

const { db, schema, dbClient } = await import("@/db/client");
const { runMigrations } = await import("@/db/migrate");
const { bootstrapWorkspace } = await import("@/server/workspaces");
const { creditsOfRequest, insertRunningRows, listRuns, runningRequestIds, settleRequest, updateRuns } = await import("@/server/runs");

let workspaceId = "";

const draft = {
  productId: null,
  campaignId: null,
  presetId: "pack-shot",
  channelId: "amazon_listing",
  scene: "front",
  surface: "image" as const,
  modelId: "flux-2",
  modelLabel: "Flux 2",
  prompt: "a mug",
  ratio: "1 / 1",
  meta: "2K",
  settings: { resolution: "2k" },
  credits: 2,
};

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

describe("run log", () => {
  it("opens one row per expected result, credits on the first only", async () => {
    const rows = await insertRunningRows(workspaceId, "u1", "req-a", 2, draft);
    expect(rows.map((row) => row.id)).toEqual(["req-a#0", "req-a#1"]);
    expect(rows.map((row) => row.credits)).toEqual([2, 0]);
    expect(await runningRequestIds(workspaceId, ["req-a", "req-zzz"])).toEqual(new Set(["req-a"]));
    expect(await runningRequestIds("other-workspace", ["req-a"])).toEqual(new Set());
  });

  it("re-cuts a completed request to one row per delivered URL, keeping the charge", async () => {
    const settled = await settleRequest(workspaceId, "req-a", {
      status: { status: "completed", requestId: "req-a", images: [{ url: "https://cdn/a.png" }, { url: "https://cdn/b.png" }, { url: "https://cdn/c.png" }] },
    });
    expect(settled?.map((row) => row.urls[0])).toEqual(["https://cdn/a.png", "https://cdn/b.png", "https://cdn/c.png"]);
    expect(settled?.every((row) => row.status === "completed")).toBe(true);
    expect(await creditsOfRequest(workspaceId, "req-a")).toBe(2);
    /* Already settled: nothing running, nothing to do. */
    expect(await settleRequest(workspaceId, "req-a", { error: "late" })).toBeNull();
  });

  it("records a failure with its reason", async () => {
    await insertRunningRows(workspaceId, "u1", "req-b", 1, draft);
    const settled = await settleRequest(workspaceId, "req-b", { status: { status: "nsfw", requestId: "req-b" } });
    expect(settled?.[0]?.status).toBe("failed");
    expect(settled?.[0]?.error).toMatch(/NSFW/);
    const abandoned = await insertRunningRows(workspaceId, "u1", "req-c", 1, draft);
    expect(abandoned).toHaveLength(1);
    expect((await settleRequest(workspaceId, "req-c", { error: "timed out" }))?.[0]?.error).toBe("timed out");
  });

  it("pages newest first and hides deleted rows", async () => {
    for (let i = 0; i < 5; i++) {
      await insertRunningRows(workspaceId, "u1", `req-p${i}`, 1, draft);
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    const first = await listRuns(workspaceId, { limit: 4 });
    expect(first.runs).toHaveLength(4);
    expect(first.hasMore).toBe(true);
    expect(first.runs[0]!.requestId).toBe("req-p4");
    const oldest = first.runs[first.runs.length - 1]!.createdAt;
    const second = await listRuns(workspaceId, { limit: 4, before: oldest });
    expect(second.runs.every((run) => run.createdAt < oldest)).toBe(true);
    expect(second.runs.length + first.runs.length).toBeLessThanOrEqual(10);

    await updateRuns(workspaceId, ["req-p4"], { deletedAt: new Date() });
    const after = await listRuns(workspaceId, { limit: 4 });
    expect(after.runs[0]!.requestId).toBe("req-p3");
  });
});
