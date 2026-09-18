import type { RunRecord as ServerRunRecord } from "@/server/runs";

import { artFor } from "./artwork";

export type RunStatus = "running" | "completed" | "failed";

/** A run as the studio holds it: the server's record plus the layered art
    the grid paints under it while media loads. */
export type RunRecord = ServerRunRecord & { art: string };

export type { ServerRunRecord };

function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export function decorate(record: ServerRunRecord): RunRecord {
  return { ...record, art: artFor(record.surface, hueOf(record.id), record.id) };
}

export function decorateAll(records: ServerRunRecord[]): RunRecord[] {
  return records.map(decorate);
}

/** Session rows win on id collision so a generate that landed before the
    server list arrived is not wiped by the delayed load. */
export function mergeHistory(stored: RunRecord[], live: RunRecord[]): RunRecord[] {
  const byId = new Map<string, RunRecord>();
  for (const row of [...stored, ...live]) {
    const prev = byId.get(row.id);
    if (!prev || newerRecord(row, prev)) byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function requestIdOf(record: RunRecord): string {
  return record.requestId || record.id.split("#")[0]!;
}

/** Swap every row of a request for its settled records, or no-op if the
    visitor already deleted the in-flight tiles. */
export function replaceRequest(records: RunRecord[], requestId: string, next: RunRecord[]): RunRecord[] {
  if (!records.some((record) => record.status === "running" && requestIdOf(record) === requestId)) {
    return records;
  }
  return [...next, ...records.filter((record) => requestIdOf(record) !== requestId)].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}

function newerRecord(row: RunRecord, prev: RunRecord): boolean {
  const rowDone = row.status !== "running";
  const prevDone = prev.status !== "running";
  if (rowDone !== prevDone) return rowDone;
  return row.createdAt >= prev.createdAt;
}

export function timeAgo(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

/* One step along the runs the visitor is actually looking at, or null at the
   ends — the walk stops there rather than wrapping, so the edge of the scope
   can be felt. A run that has left the list steps nowhere. */
export function stepRun(records: RunRecord[], id: string, delta: number): RunRecord | null {
  const from = records.findIndex((record) => record.id === id);
  if (from < 0) return null;
  return records[from + delta] ?? null;
}
