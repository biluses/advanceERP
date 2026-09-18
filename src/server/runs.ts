import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm";

import { db, schema } from "@/db/client";
import type { RunRow } from "@/db/schema";
import type { Surface } from "@/generation/catalog/types";
import type { GenerationStatus } from "@/generation/platform";

/** The row the studio renders. Mirrors RunRow with dates as numbers, since it
    crosses the server-action boundary and lands in client state. */
export interface RunRecord {
  id: string;
  requestId: string;
  surface: Surface;
  kind: Surface;
  modelId: string;
  modelLabel: string;
  prompt: string;
  scene: string;
  ratio: string;
  meta: string;
  badge?: string;
  urls: string[];
  status: "running" | "completed" | "failed";
  error?: string;
  favorite: boolean;
  review: "pending" | "approved" | "rejected";
  settings: Record<string, unknown>;
  credits: number;
  productId: string | null;
  campaignId: string | null;
  presetId: string | null;
  channelId: string | null;
  createdAt: number;
}

export type RunContext = {
  productId: string | null;
  campaignId: string | null;
  presetId: string | null;
  channelId: string | null;
  scene: string;
};

export type RunDraft = RunContext & {
  surface: Surface;
  modelId: string;
  modelLabel: string;
  prompt: string;
  ratio: string;
  meta: string;
  badge?: string;
  settings: Record<string, unknown>;
  credits: number;
};

export const HISTORY_LIMIT = 120;

export function toRunRecord(row: RunRow): RunRecord {
  return {
    id: row.id,
    requestId: row.requestId,
    surface: row.surface,
    kind: row.surface,
    modelId: row.modelId,
    modelLabel: row.modelLabel,
    prompt: row.prompt,
    scene: row.scene,
    ratio: row.ratio,
    meta: row.meta,
    badge: row.badge ?? undefined,
    urls: row.urls,
    status: row.status,
    error: row.error ?? undefined,
    favorite: row.favorite,
    review: row.review,
    settings: row.settings,
    credits: row.credits,
    productId: row.productId,
    campaignId: row.campaignId,
    presetId: row.presetId,
    channelId: row.channelId,
    createdAt: row.createdAt.getTime(),
  };
}

function rowId(requestId: string, offset: number, count: number): string {
  return count > 1 ? `${requestId}#${offset}` : requestId;
}

/** One row per expected result, all waiting on the same platform request. */
export async function insertRunningRows(
  workspaceId: string,
  userId: string,
  requestId: string,
  count: number,
  draft: RunDraft,
): Promise<RunRecord[]> {
  const now = new Date();
  const rows = Array.from({ length: Math.max(1, count) }, (_, offset) => ({
    id: rowId(requestId, offset, count),
    workspaceId,
    userId,
    requestId,
    productId: draft.productId,
    campaignId: draft.campaignId,
    presetId: draft.presetId,
    channelId: draft.channelId,
    surface: draft.surface,
    modelId: draft.modelId,
    modelLabel: draft.modelLabel,
    prompt: draft.prompt,
    scene: draft.scene,
    ratio: draft.ratio,
    meta: draft.meta,
    badge: draft.badge ?? null,
    urls: [] as string[],
    status: "running" as const,
    error: null,
    favorite: false,
    review: "pending" as const,
    settings: draft.settings,
    /* The whole request's cost sits on its first row, so a batch is charged
       once and refunded once. */
    credits: offset === 0 ? draft.credits : 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }));
  await db.insert(schema.run).values(rows);
  const stored = await db.select().from(schema.run).where(eq(schema.run.requestId, requestId));
  return stored.map(toRunRecord);
}

export function failureText(status: GenerationStatus): string {
  if (status.status === "nsfw") return "the platform flagged the result as NSFW";
  if (status.status === "canceled") return "the run was canceled";
  if (typeof status.error === "string" && status.error) return status.error;
  return "the platform reported a failure";
}

/** Replace a request's running rows with its outcome. Returns the settled
    rows, or null when nothing was running for it (already settled, or the
    tiles were deleted while in flight). */
export async function settleRequest(
  workspaceId: string,
  requestId: string,
  outcome: { status: GenerationStatus } | { error: string },
): Promise<RunRecord[] | null> {
  const running = await db
    .select()
    .from(schema.run)
    .where(
      and(eq(schema.run.workspaceId, workspaceId), eq(schema.run.requestId, requestId), eq(schema.run.status, "running")),
    );
  if (running.length === 0) return null;

  const now = new Date();
  const first = running[0]!;
  const urls =
    "status" in outcome
      ? (outcome.status.images?.map((image) => image.url) ?? (outcome.status.video ? [outcome.status.video.url] : []))
      : [];
  const completed = "status" in outcome && outcome.status.status === "completed" && urls.length > 0;
  const error = completed ? null : "status" in outcome ? failureText(outcome.status) : outcome.error;

  if (completed) {
    /* The platform may answer with more or fewer media than tiles were opened
       for. Rows are re-cut to one per delivered URL, keeping the first row's
       credits and the request's identity. */
    const total = urls.length;
    const rows = urls.map((url, offset) => ({
      ...first,
      id: rowId(requestId, offset, total),
      urls: [url],
      status: "completed" as const,
      error: null,
      credits: offset === 0 ? first.credits : 0,
      updatedAt: now,
    }));
    await db.batch([
      db.delete(schema.run).where(and(eq(schema.run.requestId, requestId), eq(schema.run.status, "running"))),
      db.insert(schema.run).values(rows).onConflictDoNothing(),
    ]);
  } else {
    await db
      .update(schema.run)
      .set({ status: "failed", error, urls: [], updatedAt: now })
      .where(and(eq(schema.run.requestId, requestId), eq(schema.run.status, "running")));
  }
  const settled = await db.select().from(schema.run).where(eq(schema.run.requestId, requestId));
  return settled.map(toRunRecord);
}

/** Newest first. `before` (a createdAt in ms) pages further back; the page
    is one over the limit so the caller knows whether more exist. */
export async function listRuns(
  workspaceId: string,
  options: { limit?: number; before?: number | null } = {},
): Promise<{ runs: RunRecord[]; hasMore: boolean }> {
  const limit = options.limit ?? HISTORY_LIMIT;
  const rows = await db
    .select()
    .from(schema.run)
    .where(
      and(
        eq(schema.run.workspaceId, workspaceId),
        isNull(schema.run.deletedAt),
        ...(options.before ? [lt(schema.run.createdAt, new Date(options.before))] : []),
      ),
    )
    .orderBy(desc(schema.run.createdAt))
    .limit(limit + 1);
  return { runs: rows.slice(0, limit).map(toRunRecord), hasMore: rows.length > limit };
}

/** Every run of one campaign — campaigns are small and the page shows all. */
export async function listCampaignRuns(workspaceId: string, campaignId: string): Promise<RunRecord[]> {
  const rows = await db
    .select()
    .from(schema.run)
    .where(and(eq(schema.run.workspaceId, workspaceId), eq(schema.run.campaignId, campaignId), isNull(schema.run.deletedAt)))
    .orderBy(desc(schema.run.createdAt));
  return rows.map(toRunRecord);
}

export async function runningRequestIds(workspaceId: string, requestIds: string[]): Promise<Set<string>> {
  if (requestIds.length === 0) return new Set();
  const rows = await db
    .select({ requestId: schema.run.requestId })
    .from(schema.run)
    .where(
      and(
        eq(schema.run.workspaceId, workspaceId),
        eq(schema.run.status, "running"),
        inArray(schema.run.requestId, requestIds),
      ),
    );
  return new Set(rows.map((row) => row.requestId));
}

export async function creditsOfRequest(workspaceId: string, requestId: string): Promise<number> {
  const rows = await db
    .select({ credits: schema.run.credits })
    .from(schema.run)
    .where(and(eq(schema.run.workspaceId, workspaceId), eq(schema.run.requestId, requestId)));
  return rows.reduce((total, row) => total + row.credits, 0);
}

export async function updateRuns(
  workspaceId: string,
  ids: string[],
  patch: Partial<Pick<RunRow, "favorite" | "review" | "deletedAt">>,
): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(schema.run)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.run.workspaceId, workspaceId), inArray(schema.run.id, ids)));
}

export async function runsByIds(workspaceId: string, ids: string[]): Promise<RunRecord[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(schema.run)
    .where(and(eq(schema.run.workspaceId, workspaceId), inArray(schema.run.id, ids)));
  return rows.map(toRunRecord);
}
