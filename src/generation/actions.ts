"use server";

import { eq } from "drizzle-orm";

import { db, schema } from "@/db/client";
import { creditsFor } from "@/domain/pricing";
import { InsufficientCreditsError, refundCredits, reserveCredits } from "@/server/credits";
import { creditsOfRequest, insertRunningRows, runningRequestIds, settleRequest, type RunContext, type RunRecord } from "@/server/runs";
import { seal, unseal } from "@/server/seal";
import { requireViewer, type Viewer } from "@/server/session";

import { getModel, parseSettings } from "./catalog";
import type { GenerationPlane } from "./catalog/types";
import {
  MissingCredentialsError,
  operatorKey,
  parseCredentialInput,
  platformBaseUrl,
  type KeyMode,
} from "./credentials";
import { createPlatformClient } from "./platform";
import type { GenerationStatus } from "./platform";
import { toPlatform } from "./to-platform";

/* ---------- keys ---------- */

export type KeyStatus = { mode: KeyMode; byok: boolean; canEdit: boolean };

/** Where this workspace's runs are billed: its own key when it brought one,
    the operator's otherwise — or nowhere, which the studio reports up front. */
export async function platformKeyStatus(): Promise<KeyStatus> {
  const viewer = await requireViewer();
  const byok = Boolean(viewer.workspace.platformKeySealed);
  const mode: KeyMode = byok ? "byok" : operatorKey() ? "operator" : "none";
  return { mode, byok, canEdit: viewer.role === "owner" };
}

export async function savePlatformCredentials(data: unknown): Promise<KeyStatus> {
  const viewer = await requireOwner();
  const { apiKey } = parseCredentialInput(data);
  await db
    .update(schema.workspace)
    .set({ platformKeySealed: seal(apiKey), updatedAt: new Date() })
    .where(eq(schema.workspace.id, viewer.workspace.id));
  return { mode: "byok", byok: true, canEdit: true };
}

export async function clearPlatformCredentials(): Promise<KeyStatus> {
  const viewer = await requireOwner();
  await db
    .update(schema.workspace)
    .set({ platformKeySealed: null, updatedAt: new Date() })
    .where(eq(schema.workspace.id, viewer.workspace.id));
  return { mode: operatorKey() ? "operator" : "none", byok: false, canEdit: true };
}

async function requireOwner(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "owner") throw new Error("Only the workspace owner can change the platform key");
  return viewer;
}

function resolveCredentials(viewer: Viewer): { apiKey: string; baseUrl: string; mode: KeyMode } {
  const baseUrl = platformBaseUrl();
  const sealed = viewer.workspace.platformKeySealed;
  if (sealed) {
    const apiKey = unseal(sealed);
    if (apiKey) return { apiKey, baseUrl, mode: "byok" };
  }
  const key = operatorKey();
  if (key) return { apiKey: key, baseUrl, mode: "operator" };
  throw new MissingCredentialsError();
}

/* ---------- generate ---------- */

export type SubmitInput = {
  plane: GenerationPlane;
  context: RunContext;
  /** Tiles the studio opened for this request; the platform decides the real
      count when it answers. */
  expected: number;
  /** Presentation the studio computed for the tile and viewer. */
  view: { ratio: string; meta: string; badge?: string };
};

export type SubmitResult = {
  requestId: string;
  credits: number;
  mode: KeyMode;
  runs: RunRecord[];
};

/** Submit one generation. The credit debit happens before the platform is
    asked and is refunded if the ask itself fails; a run the platform accepts
    and later fails is refunded when its status settles. */
export async function submitGeneration(input: SubmitInput): Promise<SubmitResult> {
  const viewer = await requireViewer();
  const model = getModel(input.plane.model);
  const parsed: GenerationPlane = { ...input.plane, settings: parseSettings(model, input.plane.settings) };
  if (!parsed.prompt.text.trim()) throw new Error("Write a prompt first");

  const credentials = resolveCredentials(viewer);
  const credits = credentials.mode === "byok" ? 0 : creditsFor(model, parsed.settings);
  const reservationKey = `reserve:${crypto.randomUUID()}`;
  if (credits > 0) await reserveCredits(viewer.workspace.id, credits, reservationKey);

  let queued;
  try {
    const { path, body } = toPlatform(parsed);
    queued = await createPlatformClient(credentials).submit(path, body);
  } catch (caught) {
    if (credits > 0) await refundCredits(viewer.workspace.id, credits, reservationKey, "submit failed");
    throw caught;
  }

  const runs = await insertRunningRows(viewer.workspace.id, viewer.user.id, queued.requestId, input.expected, {
    ...input.context,
    surface: model.surface,
    modelId: model.id,
    modelLabel: model.label,
    prompt: parsed.prompt.text.trim(),
    ratio: input.view.ratio,
    meta: input.view.meta,
    badge: input.view.badge,
    settings: parsed.settings,
    credits,
  });
  if (credits > 0) {
    /* Re-key the ledger entry to the platform's request id so a later refund
       can find it by the same handle the status poll carries. */
    await db
      .update(schema.creditLedger)
      .set({ requestId: queued.requestId })
      .where(eq(schema.creditLedger.requestId, reservationKey));
  }
  return { requestId: queued.requestId, credits, mode: credentials.mode, runs };
}

/* ---------- poll ---------- */

export type StatusResult =
  | { requestId: string; status: GenerationStatus; runs: RunRecord[] | null }
  | { requestId: string; error: string; runs: RunRecord[] | null };

const TERMINAL = new Set(["completed", "failed", "nsfw", "canceled"]);

/** Every request in flight, answered in one round trip. Terminal answers are
    written to the run log here — the server, not the browser, settles a run,
    so a tab that closes mid-poll loses nothing and the refund cannot be
    skipped by a client that never came back. */
export async function getGenerationStatuses(data: unknown): Promise<StatusResult[]> {
  const viewer = await requireViewer();
  const requestIds = parseRequestIds(data);
  const owned = await runningRequestIds(viewer.workspace.id, requestIds);
  const credentials = resolveCredentials(viewer);
  const client = createPlatformClient(credentials);
  return Promise.all(
    [...owned].map(async (requestId): Promise<StatusResult> => {
      try {
        const status = await client.status(requestId);
        if (!TERMINAL.has(status.status)) return { requestId, status, runs: null };
        const runs = await settleRequest(viewer.workspace.id, requestId, { status });
        if (runs && runs.some((run) => run.status === "failed")) {
          await refundForRequest(viewer.workspace.id, requestId, runs[0]?.error);
        }
        return { requestId, status, runs };
      } catch (caught) {
        const error = caught instanceof Error ? caught.message : String(caught);
        return { requestId, error, runs: null };
      }
    }),
  );
}

/** The studio gave up on a request (deadline, or the poll itself kept
    failing). Record the failure so the tiles do not stay open forever, and
    give the credits back. */
export async function abandonRequest(data: unknown): Promise<RunRecord[] | null> {
  const viewer = await requireViewer();
  const payload = asObject(data, "Invalid payload");
  const requestId = typeof payload.requestId === "string" ? payload.requestId : "";
  const reason = typeof payload.reason === "string" && payload.reason ? payload.reason : "the run did not finish";
  if (!requestId) throw new Error("Invalid request id");
  const runs = await settleRequest(viewer.workspace.id, requestId, { error: reason });
  if (runs) await refundForRequest(viewer.workspace.id, requestId, reason);
  return runs;
}

async function refundForRequest(workspaceId: string, requestId: string, note?: string): Promise<void> {
  const credits = await creditsOfRequest(workspaceId, requestId);
  if (credits > 0) await refundCredits(workspaceId, credits, requestId, note);
}

export { InsufficientCreditsError };

function parseRequestIds(data: unknown): string[] {
  const payload = asObject(data, "Invalid status payload");
  const requestIds = payload.requestIds;
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    throw new Error("Invalid request ids");
  }
  return requestIds.map((requestId) => {
    if (typeof requestId !== "string" || !requestId) throw new Error("Invalid request id");
    return requestId;
  });
}

function asObject(data: unknown, message: string): Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw new Error(message);
  return data as Record<string, unknown>;
}
