"use server";

import { requireViewer } from "@/server/session";
import { listRuns as listRunRows, runsByIds, updateRuns, type RunRecord } from "@/server/runs";

export async function listRuns(before?: number | null): Promise<{ runs: RunRecord[]; hasMore: boolean }> {
  const viewer = await requireViewer();
  return listRunRows(viewer.workspace.id, { before: before ?? null });
}

export async function setFavorite(ids: string[], favorite: boolean): Promise<void> {
  const viewer = await requireViewer();
  await updateRuns(viewer.workspace.id, ids, { favorite });
}

export async function setReview(ids: string[], review: "pending" | "approved" | "rejected"): Promise<void> {
  const viewer = await requireViewer();
  await updateRuns(viewer.workspace.id, ids, { review });
}

/** Soft: the platform's result URLs are not re-derivable, and the studio
    offers an undo. Hard deletion is the workspace owner's call elsewhere. */
export async function deleteRuns(ids: string[]): Promise<void> {
  const viewer = await requireViewer();
  await updateRuns(viewer.workspace.id, ids, { deletedAt: new Date() });
}

export async function restoreRuns(ids: string[]): Promise<RunRecord[]> {
  const viewer = await requireViewer();
  await updateRuns(viewer.workspace.id, ids, { deletedAt: null });
  return runsByIds(viewer.workspace.id, ids);
}
