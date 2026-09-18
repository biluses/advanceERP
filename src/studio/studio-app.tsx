"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MODELS, getModel, parseSettings } from "@/generation/catalog";
import { assemblePlane } from "@/generation/plane";
import { useActive } from "@/generation/stores/active";
import { useImageMedia, useVideoMedia } from "@/generation/stores/media";
import { useImagePrompt, useVideoPrompt } from "@/generation/stores/prompt";
import { useSettings } from "@/generation/stores/settings";
import { resolveSettings } from "@/domain/prompt";
import type { KeyStatus } from "@/generation/actions";

import { GRAIN_URI } from "./artwork";
import { Composer } from "./composer";
import { CROSS_VIEWS, type GalleryView } from "./data";
import { fileNameFor, saveFile } from "./download";
import { Filters } from "./filters";
import { Gallery } from "./gallery";
import { stepRun, type RunRecord } from "./history";
import { CloseIcon, UndoIcon } from "./icons";
import { finalPrompt, isProductMedia, productMedia, resolveJob } from "./job";
import { KeyModal } from "./key-modal";
import { SelectionBar, type SaveProgress } from "./selection-bar";
import { useJob } from "./stores/job";
import { Topbar } from "./topbar";
import type { ReviewFilter, StudioData } from "./types";
import { useGeneration } from "./use-generation";
import { Viewer } from "./viewer";

export type { ActiveRun } from "./use-generation";

/* Long enough to read the bar and reach it; the drain line states the window. */
const UNDO_MS = 6000;

export function StudioApp({ data, fontClassName = "" }: { data: StudioData; fontClassName?: string }) {
  const surface = useActive((state) => state.surface);
  const modelId = useActive((state) => state.model);
  const setModel = useActive((state) => state.setModel);
  const model = getModel(modelId);
  const setSettings = useSettings((state) => state.set);

  const gen = useGeneration(data.runs, data.credits);
  const { history, runs, error, setError } = gen;

  const jobIds = useJob();
  const job = useMemo(() => resolveJob(data.products, jobIds), [data.products, jobIds]);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [view, setView] = useState<GalleryView>(surface);
  const [productFilter, setProductFilterState] = useState<string | null>(null);
  const [reviewFilter, setReviewFilterState] = useState<ReviewFilter>("all");
  const [focusNonce, setFocusNonce] = useState(0);
  /* Deleting drops the only copy of a run — the platform's result URLs are not
     re-derivable — so the records are held aside until the bar times out. */
  const [deleted, setDeleted] = useState<RunRecord[] | null>(null);
  /* Picked runs, in the order they were picked: the count stack shows the most
     recent sheets on top, and a range extends from the last one touched. */
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState<SaveProgress | null>(null);
  const [key, setKey] = useState<KeyStatus>(data.key);
  const [keysOpen, setKeysOpen] = useState(false);

  const galleryRef = useRef<HTMLDivElement>(null);
  const rangeAnchor = useRef<number | null>(null);
  const visibleRef = useRef<RunRecord[]>([]);

  /* A stored product that no longer exists is let go of quietly. */
  useEffect(() => {
    if (jobIds.productId && !data.products.some((entry) => entry.id === jobIds.productId)) jobIds.setProduct(null);
  }, [data.products, jobIds]);

  /* The model picker can cross surfaces, so the scope follows it — unless the
     visitor parked on a scope that spans both. Synchronised during render,
     the way React asks derived state to be. */
  const [seenSurface, setSeenSurface] = useState(surface);
  if (seenSurface !== surface) {
    setSeenSurface(surface);
    if (!CROSS_VIEWS.has(view)) setView(surface);
  }

  /* A preset or channel chooses the dials; the preset picker itself chooses
     the model when one is picked. Both stay editable afterwards — the job
     sets the table, it does not lock it. */
  useEffect(() => {
    if (!job.preset && !job.channel) return;
    setSettings(model.id, resolveSettings(model, job.preset, job.channel));
  }, [job.preset, job.channel, model, setSettings]);

  /* The product's photos ride along as the preset's reference or start
     frame. Anything the visitor attached by hand is left where it is. */
  useEffect(() => {
    const store = model.surface === "image" ? useImageMedia : useVideoMedia;
    const state = store.getState();
    const wanted = productMedia(job, model);
    const current = state.items.filter(isProductMedia);
    const same =
      current.length === wanted.length && current.every((item, index) => item.id === wanted[index]!.id && item.role === wanted[index]!.role);
    if (same) return;
    for (const item of current) state.remove(item.id);
    for (const item of wanted) store.getState().add(item);
  }, [job, model]);

  const visible = useMemo(() => {
    let list = history;
    if (view === "favorites") list = list.filter((record) => record.favorite);
    else if (view !== "assets") list = list.filter((record) => record.surface === view);
    if (productFilter) list = list.filter((record) => record.productId === productFilter);
    if (reviewFilter !== "all") list = list.filter((record) => record.review === reviewFilter);
    return list;
  }, [history, view, productFilter, reviewFilter]);

  /* Switching scope or filter switches what "everything picked" means, so
     the selection does not travel with it. */
  const switchView = useCallback(
    (next: GalleryView) => {
      setView(next);
      setSelected([]);
      rangeAnchor.current = null;
      galleryRef.current?.scrollTo({ top: 0 });
      if (CROSS_VIEWS.has(next) || next === surface) return;
      const first = MODELS.find((entry) => entry.surface === next);
      if (first) setModel(first.id);
    },
    [setModel, surface],
  );

  const generate = useCallback(async () => {
    if (key.mode === "none") {
      setKeysOpen(true);
      setError("No platform key is set. Add yours to generate.");
      return;
    }
    const plane = assemblePlane();
    const text = finalPrompt(plane.prompt.text, job, data.brand);
    if (!text.trim()) return;
    galleryRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    await gen.generate({
      plane: { ...plane, prompt: { text } },
      context: {
        productId: job.product?.id ?? null,
        campaignId: null,
        presetId: job.preset?.id ?? null,
        channelId: job.channel?.id ?? null,
        scene: plane.prompt.text.trim(),
      },
      batch: useActive.getState().batch,
    });
  }, [key.mode, job, data.brand, gen, setError]);

  /* Reuse restores the whole job the run was made from — product, preset,
     channel, model, its dials, then the words. */
  const retry = useCallback(
    (record: RunRecord) => {
      jobIds.setProduct(record.productId);
      jobIds.setPreset(record.presetId);
      jobIds.setChannel(record.channelId);
      if (MODELS.some((entry) => entry.id === record.modelId)) {
        setModel(record.modelId);
        setSettings(record.modelId, parseSettings(getModel(record.modelId), record.settings));
      }
      (record.surface === "image" ? useImagePrompt : useVideoPrompt).getState().setText(record.scene || record.prompt);
      setViewerId(null);
      setError(null);
      setFocusNonce((n) => n + 1);
    },
    [jobIds, setModel, setSettings, setError],
  );

  const deleteRuns = useCallback(
    (records: RunRecord[]) => {
      if (records.length === 0) return;
      gen.remove(records);
      setDeleted(records);
    },
    [gen],
  );
  const deleteRun = useCallback((record: RunRecord) => deleteRuns([record]), [deleteRuns]);

  const restoreDeleted = useCallback(() => {
    if (!deleted) return;
    gen.restore(deleted);
    setDeleted(null);
  }, [deleted, gen]);

  useEffect(() => {
    if (!deleted) return;
    const timer = setTimeout(() => setDeleted(null), UNDO_MS);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeleted(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [deleted]);

  /* ---------- picking runs ---------- */

  /* A run that left the grid cannot stay picked — deleted, or released from
     the shelf while the Favorites scope was the one on screen. The selection
     is read through the visible set rather than pruned by an effect. */
  const visibleIds = useMemo(() => new Set(visible.map((record) => record.id)), [visible]);
  const pickedSet = useMemo(() => new Set(selected.filter((id) => visibleIds.has(id))), [selected, visibleIds]);
  const byId = useMemo(() => new Map(history.map((record) => [record.id, record])), [history]);
  const pickedRecords = useMemo(
    () => selected.filter((id) => visibleIds.has(id)).map((id) => byId.get(id)).filter((record) => record !== undefined),
    [selected, visibleIds, byId],
  );

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const clearPicked = useCallback(() => {
    setSelected([]);
    rangeAnchor.current = null;
  }, []);
  const setProductFilter = useCallback(
    (id: string | null) => {
      setProductFilterState(id);
      clearPicked();
    },
    [clearPicked],
  );
  const setReviewFilter = useCallback(
    (next: ReviewFilter) => {
      setReviewFilterState(next);
      clearPicked();
    },
    [clearPicked],
  );

  const togglePick = useCallback((id: string, index: number, range: boolean) => {
    const from = rangeAnchor.current;
    rangeAnchor.current = index;
    setSelected((prev) => {
      if (range && from !== null) {
        const span = visibleRef.current
          .slice(Math.min(from, index), Math.max(from, index) + 1)
          .filter((record) => record.status !== "running")
          .map((record) => record.id);
        const held = new Set(prev);
        return [...prev, ...span.filter((entry) => !held.has(entry))];
      }
      return prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id];
    });
  }, []);

  useEffect(() => {
    if (pickedSet.size === 0 || viewerId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearPicked();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pickedSet.size, viewerId, clearPicked]);

  const favoritePicked = useCallback(() => {
    const keep = !pickedRecords.every((record) => record.favorite);
    gen.favoriteMany(pickedRecords.map((record) => record.id), keep);
  }, [pickedRecords, gen]);

  const reviewPicked = useCallback(
    (verdict: RunRecord["review"]) => {
      gen.review(pickedRecords.map((record) => record.id), verdict);
    },
    [pickedRecords, gen],
  );

  const deletePicked = useCallback(() => {
    deleteRuns(pickedRecords);
    clearPicked();
  }, [deleteRuns, pickedRecords, clearPicked]);

  const downloadRun = useCallback(
    async (record: RunRecord) => {
      const url = record.urls[0];
      if (!url) return;
      const ok = await saveFile(url, fileNameFor(record, 0));
      if (!ok) {
        setError("The platform’s CDN refused the read, so this run could not be saved. Open it to save it from the browser instead.");
      }
    },
    [setError],
  );

  const downloadPicked = useCallback(async () => {
    const files = pickedRecords.filter((record) => record.urls[0]);
    if (files.length === 0) return;
    setSaving({ done: 0, total: files.length });
    let refused = 0;
    for (const [index, record] of files.entries()) {
      const ok = await saveFile(record.urls[0]!, fileNameFor(record, index));
      if (!ok) refused++;
      setSaving({ done: index + 1, total: files.length });
    }
    setSaving(null);
    if (refused > 0) {
      setError(
        refused === files.length
          ? "The platform’s CDN refused the read, so nothing could be saved. Open a run to save it from the browser instead."
          : `${refused} of ${files.length} files could not be saved — the platform’s CDN refused the read. Open those runs to save them from the browser.`,
      );
    }
  }, [pickedRecords, setError]);

  const applyStarter = useCallback(
    (text: string) => {
      (surface === "image" ? useImagePrompt : useVideoPrompt).getState().setText(text);
      setError(null);
      setFocusNonce((n) => n + 1);
    },
    [surface, setError],
  );

  const openViewer = useCallback((id: string) => setViewerId(id), []);
  const openKeys = useCallback(() => setKeysOpen(true), []);
  const runGenerate = useCallback(() => void generate(), [generate]);
  const downloadSelection = useCallback(() => void downloadPicked(), [downloadPicked]);
  const dismissDeleted = useCallback(() => setDeleted(null), []);
  const viewerItem = viewerId ? (history.find((record) => record.id === viewerId && record.status !== "running") ?? null) : null;

  const viewable = useMemo(() => visible.filter((record) => record.status !== "running"), [visible]);
  const prevRun = viewerId ? stepRun(viewable, viewerId, -1) : null;
  const nextRun = viewerId ? stepRun(viewable, viewerId, 1) : null;

  const runsHere = useMemo(() => runs.filter((active) => view === "assets" || active.surface === view), [runs, view]);
  const productOf = useCallback(
    (record: RunRecord) => data.products.find((entry) => entry.id === record.productId) ?? null,
    [data.products],
  );

  return (
    <div className={`vt ${fontClassName}`} style={{ "--vt-grain": GRAIN_URI } as React.CSSProperties}>
      <div className="vt-shell">
        <main className="vt-main">
          <Topbar
            view={view}
            onView={switchView}
            busy={gen.busy}
            credits={gen.credits}
            keyStatus={key}
            onKeys={openKeys}
          />

          <Gallery
            view={view}
            filters={
              data.products.length > 0 && (
                <Filters
                  products={data.products}
                  productId={productFilter}
                  review={reviewFilter}
                  onProduct={setProductFilter}
                  onReview={setReviewFilter}
                />
              )
            }
            surface={surface}
            items={visible}
            runs={runsHere}
            freshIds={gen.freshIds}
            picked={pickedSet}
            onOpen={openViewer}
            onPick={togglePick}
            onReuse={retry}
            onFavorite={gen.toggleFavorite}
            onDownload={downloadRun}
            onDelete={deleteRun}
            onStarter={applyStarter}
            galleryRef={galleryRef}
          />

          <Composer
            surface={surface}
            model={model}
            generating={gen.busy}
            error={error}
            focusNonce={focusNonce}
            history={history}
            products={data.products}
            brand={data.brand}
            job={job}
            initialUploads={data.uploads}
            selecting={pickedSet.size > 0}
            selection={
              <SelectionBar
                records={pickedRecords}
                saving={saving}
                onDownload={downloadSelection}
                onFavorite={favoritePicked}
                onReview={reviewPicked}
                onDelete={deletePicked}
                onClose={clearPicked}
              />
            }
            onError={setError}
            onGenerate={runGenerate}
            notice={deleted && <UndoBar records={deleted} onUndo={restoreDeleted} onDismiss={dismissDeleted} />}
          />
        </main>

        {viewerItem && (
          <Viewer
            item={viewerItem}
            product={productOf(viewerItem)}
            onPrev={prevRun ? () => setViewerId(prevRun.id) : undefined}
            onNext={nextRun ? () => setViewerId(nextRun.id) : undefined}
            onClose={() => setViewerId(null)}
            onReuse={() => retry(viewerItem)}
            onFavorite={() => gen.toggleFavorite(viewerItem)}
            onReview={(verdict) => gen.review([viewerItem.id], verdict)}
            onDelete={() => {
              setViewerId(null);
              deleteRun(viewerItem);
            }}
          />
        )}
        {keysOpen && (
          <KeyModal
            status={key}
            onClose={() => setKeysOpen(false)}
            onChange={(next) => {
              setKey(next);
              setError(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* Deletion's receipt, in the strip the composer already reserves for the
   generation error — the studio gains no second floating layer. */
function UndoBar({ records, onUndo, onDismiss }: { records: RunRecord[]; onUndo: () => void; onDismiss: () => void }) {
  const one = records.length === 1 ? records[0] : null;
  const subject = one ? (one.scene || one.prompt ? `“${one.scene || one.prompt}”` : `${one.modelLabel} run`) : `${records.length} runs`;

  return (
    <div className="vt-undo" role="status">
      <span className="vt-undo-drain" style={{ animationDuration: `${UNDO_MS}ms` }} aria-hidden />
      <span className="vt-undo-text">{`Deleted ${subject}`}</span>
      <button type="button" className="vt-undo-act" onClick={onUndo}>
        <UndoIcon />
        Undo
      </button>
      <button type="button" className="vt-icon-btn vt-icon-btn--ghost" aria-label="Dismiss" onClick={onDismiss}>
        <CloseIcon size={12} />
      </button>
    </div>
  );
}
