"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { submitGeneration, type SubmitInput } from "@/generation/actions";
import { getModel } from "@/generation/catalog";
import type { GenerationPlane, Surface } from "@/generation/catalog";
import { ActionFailedError, isFailure } from "@/generation/outcome";
import { POLL_DEADLINE_MS, stopWatching, watchRequest } from "@/generation/poll";
import { deleteRuns as deleteRunsAction, listRuns, restoreRuns, setFavorite, setReview } from "@/server/actions/runs";
import type { RunContext, RunRecord as ServerRunRecord } from "@/server/runs";

import { countSetting, durationBadge, metaOf, ratioToCss } from "./data";
import { decorateAll, mergeHistory, replaceRequest, requestIdOf, type RunRecord } from "./history";
import { useCredits } from "./stores/credits";

export interface ActiveRun {
  /** Identifies the skeleton this run occupies, so a batch clears one tile at
      a time as its own request settles. */
  id: string;
  surface: Surface;
  modelLabel: string;
  ratio: string;
  startedAt: number;
}

export type GenerateJob = {
  plane: GenerationPlane;
  context: RunContext;
  /** Results per press for models without a native count. */
  batch: number;
};

export type GenerationApi = {
  history: RunRecord[];
  runs: ActiveRun[];
  error: string | null;
  freshIds: string[];
  busy: boolean;
  /** Credits the workspace holds, as last reported by the server. */
  credits: number | null;
  /** Older runs exist beyond what is loaded. */
  hasMore: boolean;
  loadingMore: boolean;
  loadOlder: () => Promise<void>;
  setError: (message: string | null) => void;
  generate: (job: GenerateJob) => Promise<void>;
  toggleFavorite: (record: RunRecord) => void;
  favoriteMany: (ids: string[], favorite: boolean) => void;
  review: (ids: string[], review: RunRecord["review"]) => void;
  remove: (records: RunRecord[]) => void;
  restore: (records: RunRecord[]) => void;
};

export function describeError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : String(caught);
  const kind = caught instanceof ActionFailedError ? caught.kind : "unknown";
  switch (kind) {
    case "auth":
      return "Your session ended. Sign in again to keep generating.";
    case "credentials":
      return "No platform key is set. Add yours in Settings, or ask the operator to configure one.";
    case "credits":
      return `${message}. Upgrade the plan or top up in Settings.`;
    case "platform-credits":
      return "The platform account behind the key has no credits left. Top it up at Higgsfield, or bring your own key in Settings.";
    case "platform":
      return `The platform rejected the request — ${message}. Adjust the settings and retry; if it repeats, check the key in Settings.`;
    case "input":
      return message;
    default:
      if (message.includes("Sign in")) return "Your session ended. Sign in again to keep generating.";
      return `Generation failed — ${message}. Try again; if it repeats, check the key in Settings.`;
  }
}

/** The generation lifecycle, shared by the studio and the campaign page:
    optimistic tiles, one server action per press, a watch per request and the
    server's settled rows written back over the skeletons. */
export function useGeneration(initial: ServerRunRecord[], initialCredits: number | null, initialHasMore = false): GenerationApi {
  const [history, setHistory] = useState<RunRecord[]>(() => decorateAll(initial));
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [runs, setRuns] = useState<ActiveRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [freshIds, setFreshIds] = useState<string[]>([]);
  const credits = useCredits((state) => state.balance);
  const adjustCredits = useCredits((state) => state.adjust);
  const press = useRef(0);
  const alive = useRef(true);
  const freshTimers = useRef<number[]>([]);
  const historyRef = useRef(history);
  historyRef.current = history;

  /* The server's balance is the truth on every page load; the hook only
     moves it while runs are in flight. */
  useEffect(() => {
    useCredits.getState().set(initialCredits);
  }, [initialCredits]);

  useEffect(() => {
    alive.current = true;
    const timers = freshTimers.current;
    return () => {
      alive.current = false;
      stopWatching();
      for (const timer of timers) clearTimeout(timer);
      timers.length = 0;
    };
  }, []);

  /* Each arrival blooms on its own clock: a batch lands over several seconds,
     and one shared timer would cut the last tile's entrance short. */
  const markFresh = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setFreshIds((prev) => [...prev, ...ids]);
    freshTimers.current.push(
      window.setTimeout(() => setFreshIds((prev) => prev.filter((id) => !ids.includes(id))), 900),
    );
  }, []);

  /* One watch per platform request, used both by Generate and by a mount that
     found running rows already in the log. */
  const resume = useCallback(
    async (requestId: string, createdAt: number, credits: number) => {
      try {
        const settled = await watchRequest(requestId, { deadline: createdAt + POLL_DEADLINE_MS });
        if (!alive.current) return;
        if (!settled) {
          setHistory((prev) => prev.filter((record) => !(record.status === "running" && requestIdOf(record) === requestId)));
          return;
        }
        const records = decorateAll(settled);
        setHistory((prev) => replaceRequest(prev, requestId, records));
        markFresh(records.filter((record) => record.status === "completed").map((record) => record.id));
        if (records.some((record) => record.status === "failed")) {
          if (credits > 0) adjustCredits(credits);
          const failure = records[0]?.error ?? "the platform reported a failure";
          setError((prev) => prev ?? `Run not delivered — ${failure}. Adjust the scene or settings and retry.`);
        }
      } catch (caught) {
        if (!alive.current) return;
        setError((prev) => prev ?? describeError(caught));
      }
    },
    [markFresh, adjustCredits],
  );

  /* Pick up any request still on the platform when the last session died. */
  useEffect(() => {
    const seen = new Set<string>();
    for (const record of historyRef.current) {
      if (record.status !== "running") continue;
      const requestId = requestIdOf(record);
      if (seen.has(requestId)) continue;
      seen.add(requestId);
      void resume(requestId, record.createdAt, record.credits);
    }
  }, [resume]);

  /* Presses do not wait on each other. A press snapshots its own plane, opens
     its own skeletons and keeps its own watch, so the composer is free the
     moment the tiles appear and any number of runs can be in flight. */
  const generate = useCallback(
    async (job: GenerateJob) => {
      const { plane } = job;
      const entry = getModel(plane.model);
      const ratio = ratioToCss(plane.settings.aspectRatio, entry.surface === "image" ? "4 / 3" : "16 / 9");
      const view = {
        ratio,
        meta: metaOf(entry, plane.settings),
        badge: entry.surface === "video" ? durationBadge(plane.settings) : undefined,
      };
      const native = countSetting(entry);
      const expected = native ? Math.max(1, Number(plane.settings[native.key]) || 1) : job.batch;
      const startedAt = Date.now();
      const seq = ++press.current;
      const pending: ActiveRun[] = Array.from({ length: expected }, (_, index) => ({
        id: `pending-${seq}-${index}`,
        surface: entry.surface,
        modelLabel: entry.label,
        ratio,
        startedAt,
      }));
      const slots = native ? [{ skeletons: pending.map((slot) => slot.id) }] : pending.map((slot) => ({ skeletons: [slot.id] }));

      setError(null);
      setRuns((prev) => [...pending, ...prev]);

      const runOne = async (slot: { skeletons: string[] }) => {
        const input: SubmitInput = { plane, context: job.context, expected: slot.skeletons.length, view };
        try {
          const result = await submitGeneration(input);
          if (isFailure(result)) throw new ActionFailedError(result);
          if (!alive.current) return;
          const records = decorateAll(result.runs);
          setHistory((prev) => mergeHistory(prev, records));
          setRuns((prev) => prev.filter((active) => !slot.skeletons.includes(active.id)));
          if (result.credits > 0) adjustCredits(-result.credits);
          await resume(result.requestId, startedAt, result.credits);
        } catch (caught) {
          if (!alive.current) return;
          setError((prev) => prev ?? describeError(caught));
        } finally {
          if (alive.current) setRuns((prev) => prev.filter((active) => !slot.skeletons.includes(active.id)));
        }
      };
      await Promise.all(slots.map(runOne));
    },
    [resume, adjustCredits],
  );

  const favoriteMany = useCallback((ids: string[], favorite: boolean) => {
    const set = new Set(ids);
    setHistory((prev) => prev.map((entry) => (set.has(entry.id) ? { ...entry, favorite } : entry)));
    void setFavorite(ids, favorite).catch(() => {
      /* The optimistic mark stays; the next load shows the truth. */
    });
  }, []);

  const toggleFavorite = useCallback(
    (record: RunRecord) => favoriteMany([record.id], !record.favorite),
    [favoriteMany],
  );

  const review = useCallback((ids: string[], verdict: RunRecord["review"]) => {
    const set = new Set(ids);
    setHistory((prev) => prev.map((entry) => (set.has(entry.id) ? { ...entry, review: verdict } : entry)));
    void setReview(ids, verdict).catch(() => {});
  }, []);

  const remove = useCallback((records: RunRecord[]) => {
    if (records.length === 0) return;
    const ids = new Set(records.map((record) => record.id));
    setHistory((prev) => prev.filter((entry) => !ids.has(entry.id)));
    void deleteRunsAction([...ids]).catch(() => {});
  }, []);

  /* History is newest-first by construction, so the restored runs drop back
     into their own places rather than onto the top of the grid. */
  const restore = useCallback((records: RunRecord[]) => {
    if (records.length === 0) return;
    setHistory((prev) => {
      const here = new Set(prev.map((entry) => entry.id));
      const back = records.filter((entry) => !here.has(entry.id));
      if (back.length === 0) return prev;
      return [...prev, ...back].sort((a, b) => b.createdAt - a.createdAt);
    });
    void restoreRuns(records.map((record) => record.id)).catch(() => {});
  }, []);

  /* The next page starts before the oldest run on screen. */
  const loadOlder = useCallback(async () => {
    if (loadingMore) return;
    const oldest = historyRef.current.reduce<number | null>((min, record) => (min === null || record.createdAt < min ? record.createdAt : min), null);
    setLoadingMore(true);
    try {
      const page = await listRuns(oldest);
      if (!alive.current) return;
      setHistory((prev) => mergeHistory(prev, decorateAll(page.runs)));
      setHasMore(page.hasMore);
    } catch (caught) {
      if (alive.current) setError((prev) => prev ?? describeError(caught));
    } finally {
      if (alive.current) setLoadingMore(false);
    }
  }, [loadingMore]);

  const busy = runs.length > 0 || history.some((record) => record.status === "running");

  return useMemo(
    () => ({
      history,
      runs,
      error,
      freshIds,
      busy,
      credits,
      hasMore,
      loadingMore,
      loadOlder,
      setError,
      generate,
      toggleFavorite,
      favoriteMany,
      review,
      remove,
      restore,
    }),
    [history, runs, error, freshIds, busy, credits, hasMore, loadingMore, loadOlder, generate, toggleFavorite, favoriteMany, review, remove, restore],
  );
}
