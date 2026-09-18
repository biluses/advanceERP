import { abandonRequest, getGenerationStatuses } from "./actions";
import type { StatusResult } from "./actions";
import type { RunRecord } from "@/server/runs";

/** Statuses the platform never moves off again. */
const TERMINAL = new Set(["completed", "failed", "nsfw", "canceled"]);

export const POLL_INTERVAL_MS = 4000;
export const POLL_DEADLINE_MS = 10 * 60_000;
/** Rounds allowed to fail back to back before the watches are given up on. One
    dropped round must not end every generation in flight. */
const MAX_MISSES = 3;

/** What a watch resolves with: the rows the server wrote for the request, or
    null when nothing was running for it any more (deleted while in flight,
    or settled by another tab). */
export type Settled = RunRecord[] | null;

type Waiter = {
  deadline: number;
  resolve: (settled: Settled) => void;
  reject: (reason: Error) => void;
};

const waiting = new Map<string, Waiter>();
const inflight = new Map<string, Promise<Settled>>();
let timer: ReturnType<typeof setTimeout> | null = null;
let polling = false;
let misses = 0;

/** Resolves when the platform reports a terminal status for this request and
    the server has settled its rows. Every request in flight is asked for
    together, in one server action per interval: Next dispatches server
    actions one at a time per client, so a poll per run would queue ahead of
    the next submit and the composer would stall. */
export function watchRequest(requestId: string, opts?: { deadline?: number }): Promise<Settled> {
  const existing = inflight.get(requestId);
  if (existing) return existing;
  const promise = new Promise<Settled>((resolve, reject) => {
    waiting.set(requestId, {
      deadline: opts?.deadline ?? Date.now() + POLL_DEADLINE_MS,
      resolve: (settled) => {
        inflight.delete(requestId);
        resolve(settled);
      },
      reject: (reason) => {
        inflight.delete(requestId);
        reject(reason);
      },
    });
    schedule();
  });
  inflight.set(requestId, promise);
  return promise;
}

/** Drops every watch without settling it: the studio unmounted and there is
    nobody left to hand a result to. In-flight jobs stay in the run log and
    the next mount starts a fresh watch. */
export function stopWatching(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  misses = 0;
  waiting.clear();
  inflight.clear();
}

function schedule(): void {
  if (timer !== null || polling || waiting.size === 0) return;
  timer = setTimeout(() => void round(), POLL_INTERVAL_MS);
}

async function round(): Promise<void> {
  timer = null;
  polling = true;
  try {
    const ids = [...waiting.keys()];
    const results = await getGenerationStatuses({ requestIds: ids });
    misses = 0;
    const answered = new Set(results.map((result) => result.requestId));
    for (const result of results) deliver(result);
    /* A request the server no longer holds as running has been settled or
       deleted elsewhere; there is nothing left to wait for. */
    for (const id of ids) {
      if (answered.has(id)) continue;
      const waiter = waiting.get(id);
      if (!waiter) continue;
      waiting.delete(id);
      waiter.resolve(null);
    }
    await sweep();
  } catch (caught) {
    if (++misses < MAX_MISSES) return;
    settleAll(caught instanceof Error ? caught : new Error(String(caught)));
  } finally {
    polling = false;
    schedule();
  }
}

function deliver(result: StatusResult): void {
  const waiter = waiting.get(result.requestId);
  if (!waiter) return;
  if ("error" in result) {
    /* One request's poll failing is not the run failing: the platform may be
       slow on that id alone. Keep waiting until the deadline. */
    return;
  }
  if (!TERMINAL.has(result.status.status)) return;
  waiting.delete(result.requestId);
  waiter.resolve(result.runs);
}

/* A run the platform never finishes would otherwise hold its skeleton open for
   the rest of the session — and its credits. The server records the timeout
   and refunds. */
async function sweep(): Promise<void> {
  const now = Date.now();
  for (const [requestId, waiter] of [...waiting]) {
    if (now <= waiter.deadline) continue;
    waiting.delete(requestId);
    try {
      waiter.resolve(await abandonRequest({ requestId, reason: "timed out waiting for the platform" }));
    } catch (caught) {
      waiter.reject(caught instanceof Error ? caught : new Error(String(caught)));
    }
  }
}

function settleAll(reason: Error): void {
  const waiters = [...waiting.values()];
  waiting.clear();
  misses = 0;
  for (const waiter of waiters) waiter.reject(reason);
}
