"use client";

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { Surface } from "@/generation/catalog";

import { swatchFor } from "./artwork";
import { CROSS_VIEWS, SAMPLES, pickSamples, type GalleryView } from "./data";
import type { ActiveRun } from "./use-generation";
import {
  ArrowRightIcon,
  CheckIcon,
  DownloadIcon,
  HeartIcon,
  PlayBadgeIcon,
  RejectIcon,
  RetryIcon,
  TrashIcon,
  WarningIcon,
} from "./icons";
import { timeAgo, type RunRecord } from "./history";
import { ModelIcon } from "./model-icon";

const EMPTY: Record<GalleryView, { title: string; hint: string }> = {
  image: {
    title: "Your product images land here",
    hint: "Pick a product and a preset below, say where the product is, press Generate. Every finished run is saved to the workspace.",
  },
  video: {
    title: "Your product clips land here",
    hint: "Pick a product and a preset below, describe the moment, press Generate. Every finished run is saved to the workspace.",
  },
  assets: {
    title: "Nothing generated yet",
    hint: "Image and video runs both land in this grid and are shared with everyone in the workspace.",
  },
  favorites: {
    title: "Nothing kept yet",
    hint: "Hover a run and press its heart to keep it here. Approve runs to mark them ready for a campaign export.",
  },
};

/* Action labels name the run they act on — tabbing a long grid otherwise
   reads as forty identical "Delete run"s. */
function shortPrompt(prompt: string): string {
  return prompt.length > 48 ? `${prompt.slice(0, 47)}…` : prompt;
}

const GRID_GAP = 14;
const COLUMNS = 4;
/** Every tile is the same 4:3 slot; media is contained so it keeps its own ratio. */
const CARD_RATIO = 4 / 3;

type Slot =
  | { key: string; kind: "run"; run: ActiveRun }
  | { key: string; kind: "item"; item: RunRecord; index: number };

function slotsOf(runs: ActiveRun[], items: RunRecord[]): Slot[] {
  const slots: Slot[] = runs.map((run) => ({ key: run.id, kind: "run", run }));
  items.forEach((item, index) => {
    if (item.status === "running") {
      slots.push({
        key: item.id,
        kind: "run",
        run: {
          id: item.id,
          surface: item.surface,
          modelLabel: item.modelLabel,
          ratio: item.ratio,
          startedAt: item.createdAt,
        },
      });
      return;
    }
    slots.push({ key: item.id, kind: "item", item, index });
  });
  return slots;
}

function useInnerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const styles = getComputedStyle(node);
      const pad = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      setWidth(Math.max(0, node.clientWidth - pad));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

const Tile = memo(function Tile({
  item,
  index,
  fresh,
  picked,
  selecting,
  onOpen,
  onPick,
  onReuse,
  onFavorite,
  onDownload,
  onDelete,
}: {
  item: RunRecord;
  index: number;
  fresh: boolean;
  picked: boolean;
  /* Once anything is picked the grid is in selection mode: every checkbox
     stands, and the card body toggles rather than opens. */
  selecting: boolean;
  onOpen: (id: string) => void;
  onPick: (id: string, index: number, range: boolean) => void;
  onReuse: (item: RunRecord) => void;
  onFavorite: (item: RunRecord) => void;
  onDownload: (item: RunRecord) => Promise<void>;
  onDelete: (item: RunRecord) => void;
}) {
  const delay = `${Math.min(index * 0.035, 0.28).toFixed(3)}s`;
  const poster = item.urls[0];
  const videoRef = useRef<HTMLVideoElement>(null);
  /* The keep beat is driven from the click, never from mount: a CSS animation
     bound to the saved state alone would re-fire on every scope switch. */
  const [beat, setBeat] = useState(false);
  /* A video is megabytes read over the wire before the browser is handed
     anything, so the press has to say it landed. */
  const [saving, setSaving] = useState(false);
  const saved = item.favorite === true;
  const named = shortPrompt(item.prompt);
  const facts = item.meta ? item.meta.split(" · ") : [];

  /* Top-left, where a selection mark is looked for, and the one control on the
     card that is not about this run alone. It carries the whole checkbox
     semantics rather than a pressed button: a grid of these is a multi-select,
     and a screen reader should hear it as one. */
  const picker = (
    <button
      type="button"
      className="vt-pick"
      role="checkbox"
      aria-checked={picked}
      aria-label={`Select run — ${named}`}
      title={picked ? "Deselect" : "Select"}
      onClick={(event) => onPick(item.id, index, event.shiftKey)}
    >
      <span className="vt-pick-box">
        <CheckIcon size={12} />
      </span>
    </button>
  );

  const remove = (
    <button
      type="button"
      className="vt-tile-act vt-tile-act--danger"
      aria-label={`Delete run — ${named}`}
      title="Delete run"
      onClick={() => onDelete(item)}
    >
      <TrashIcon size={15} />
    </button>
  );

  if (item.status === "failed") {
    return (
      <div
        className="vt-tile vt-tile--failed"
        data-picked={picked}
      >
        <div className="vt-fail">
          <span className="vt-fail-ic">
            <WarningIcon />
          </span>
          <span className="vt-fail-title">{item.modelLabel} didn’t deliver</span>
          <span className="vt-fail-why">{item.error}</span>
          <button
            type="button"
            className="vt-btn-solid"
            title="Reuse prompt and settings"
            onClick={() => onReuse(item)}
          >
            <RetryIcon />
            Retry this run
          </button>
        </div>
        {picker}
        <div className="vt-tile-acts">{remove}</div>
      </div>
    );
  }

  return (
    /* A container, not a button: the card's own actions cannot nest inside the
       control that opens it. The stretched .vt-tile-open carries the open. */
    <div
      className="vt-tile"
      data-fresh={fresh}
      data-picked={picked}
      data-saving={saving || undefined}
      style={{ "--d": delay } as CSSProperties}
      onMouseEnter={() => void videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => {
        const video = videoRef.current;
        if (!video) return;
        video.pause();
        video.currentTime = 0;
      }}
    >
      {poster &&
        (item.kind === "video" ? (
          <video
            ref={videoRef}
            className="vt-tile-media"
            src={poster}
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          /* Platform-hosted result on an arbitrary CDN host; next/image would
             need every provider domain allow-listed up front. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="vt-tile-media" src={poster} alt={item.prompt} loading="lazy" />
        ))}

      {/* While runs are picked the card is part of a selection, so its body
          extends the selection instead of leaving the grid for the viewer —
          the same bargain every OS file grid makes. */}
      <button
        type="button"
        className="vt-tile-open"
        onClick={(event) =>
          selecting ? onPick(item.id, index, event.shiftKey) : onOpen(item.id)
        }
        aria-label={
          selecting
            ? `${picked ? "Deselect" : "Select"} run — ${named}`
            : `Open run — ${item.modelLabel}: ${item.prompt}`
        }
      />

      {picker}

      {item.kind === "video" && item.badge && (
        <span className="vt-tile-badge">
          <PlayBadgeIcon />
          {item.badge}
        </span>
      )}
      {item.review !== "pending" && (
        <span className="vt-tile-review" data-review={item.review} title={item.review === "approved" ? "Approved" : "Rejected"}>
          {item.review === "approved" ? <CheckIcon size={11} /> : <RejectIcon size={11} />}
        </span>
      )}
      {/* The run signs itself only while the card is under the cursor, the same
          bargain the action rail makes — an un-hovered grid is nothing but the
          work. What distinguishes two cards of the same model is the words that
          made them, so the prompt leads; the model joins the stored one-liner's
          facts below, on the plate the rest of the card's chrome uses. */}
      <span className="vt-tile-caption">
        <span className="vt-tile-prompt">{item.prompt}</span>
        <span className="vt-tile-facts">
          <span className="vt-tile-fact vt-tile-fact--model">
            <ModelIcon modelId={item.modelId} size={12} />
            {item.modelLabel}
          </span>
          {facts.map((fact) => (
            <span className="vt-tile-fact" key={fact}>
              {fact}
            </span>
          ))}
        </span>
      </span>

      {/* Keep sits last, hard against the corner: it is the one action that
          shows on an un-hovered card, and the transient three open to its left
          rather than leaving it stranded mid-edge. Delete leads from the far
          end, the slot furthest from the corner the cursor arrives at. */}
      <div className="vt-tile-acts">
        {remove}
        <button
          type="button"
          className="vt-tile-act"
          aria-label={`Reuse prompt and settings — ${named}`}
          title="Reuse prompt and settings"
          onClick={() => onReuse(item)}
        >
          <RetryIcon size={15} />
        </button>
        {/* Absent on a run the platform returned no file for — there would be
            nothing to save. The press is guarded rather than disabled: a
            disabled button drops the focus that is holding this rail open. */}
        {poster && (
          <button
            type="button"
            className="vt-tile-act"
            aria-label={saving ? `Saving — ${named}` : `Download run — ${named}`}
            title={saving ? "Saving" : "Download"}
            onClick={() => {
              if (saving) return;
              setSaving(true);
              void onDownload(item).finally(() => setSaving(false));
            }}
          >
            {saving ? <span className="vt-spinner" aria-hidden /> : <DownloadIcon size={15} />}
          </button>
        )}
        <button
          type="button"
          className="vt-tile-act"
          data-on={saved}
          data-beat={beat || undefined}
          aria-pressed={saved}
          aria-label={`${saved ? "Remove from favorites" : "Save to favorites"} — ${named}`}
          title={saved ? "Remove from favorites" : "Save to favorites"}
          onClick={() => {
            if (!saved) setBeat(true);
            onFavorite(item);
          }}
          onAnimationEnd={() => setBeat(false)}
        >
          <HeartIcon size={16} filled={saved} />
        </button>
      </div>
    </div>
  );
});

export const Gallery = memo(function Gallery({
  view,
  filters,
  surface,
  items,
  runs,
  freshIds,
  picked,
  onOpen,
  onPick,
  onReuse,
  onFavorite,
  onDownload,
  onDelete,
  onStarter,
  galleryRef,
}: {
  view: GalleryView;
  /* The product and review cuts, drawn at the head of the panel so they
     scroll with the work rather than crowding the floating bar. */
  filters?: ReactNode;
  surface: Surface;
  items: RunRecord[];
  runs: ActiveRun[];
  freshIds: string[];
  picked: ReadonlySet<string>;
  onOpen: (id: string) => void;
  onPick: (id: string, index: number, range: boolean) => void;
  onReuse: (item: RunRecord) => void;
  onFavorite: (item: RunRecord) => void;
  onDownload: (item: RunRecord) => Promise<void>;
  onDelete: (item: RunRecord) => void;
  onStarter: (prompt: string) => void;
  galleryRef: RefObject<HTMLDivElement | null>;
}) {
  const selecting = picked.size > 0;
  const panel = {
    id: "vt-panel",
    role: "tabpanel",
    "aria-labelledby": `vt-tab-${view}`,
    className: "vt-gallery vt-scroll",
  } as const;

  if (items.length === 0 && runs.length === 0) {
    return (
      <div {...panel} ref={galleryRef}>
        {filters}
        <Empty view={view} surface={surface} onStarter={onStarter} key={view} />
      </div>
    );
  }

  return (
    <div {...panel} ref={galleryRef}>
      {filters}
      <VirtualizedGrid
        key={view}
        scrollRef={galleryRef}
        selecting={selecting}
        runs={runs}
        items={items}
        freshIds={freshIds}
        picked={picked}
        onOpen={onOpen}
        onPick={onPick}
        onReuse={onReuse}
        onFavorite={onFavorite}
        onDownload={onDownload}
        onDelete={onDelete}
      />
    </div>
  );
});

function VirtualizedGrid({
  scrollRef,
  selecting,
  runs,
  items,
  freshIds,
  picked,
  onOpen,
  onPick,
  onReuse,
  onFavorite,
  onDownload,
  onDelete,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  selecting: boolean;
  runs: ActiveRun[];
  items: RunRecord[];
  freshIds: string[];
  picked: ReadonlySet<string>;
  onOpen: (id: string) => void;
  onPick: (id: string, index: number, range: boolean) => void;
  onReuse: (item: RunRecord) => void;
  onFavorite: (item: RunRecord) => void;
  onDownload: (item: RunRecord) => Promise<void>;
  onDelete: (item: RunRecord) => void;
}) {
  const width = useInnerWidth(scrollRef);
  const slots = useMemo(() => slotsOf(runs, items), [runs, items]);
  const rows = Math.max(1, Math.ceil(slots.length / COLUMNS));

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollRef.current,
    estimateSize: (row) => {
      if (width <= 0) return 240;
      const col = (width - GRID_GAP * (COLUMNS - 1)) / COLUMNS;
      return col / CARD_RATIO + (row === rows - 1 ? 0 : GRID_GAP);
    },
    overscan: 4,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [width, slots, virtualizer]);

  return (
    <div className="vt-grid-window" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((row) => {
        const from = row.index * COLUMNS;
        const slice = slots.slice(from, from + COLUMNS);
        return (
          <div
            key={row.key}
            className="vt-grid"
            data-selecting={selecting}
            style={
              {
                "--vt-cols": COLUMNS,
                transform: `translateY(${row.start}px)`,
              } as CSSProperties
            }
          >
            {slice.map((slot) =>
              slot.kind === "run" ? (
                <RunningTile key={slot.key} run={slot.run} />
              ) : (
                <Tile
                  key={slot.key}
                  item={slot.item}
                  index={slot.index}
                  fresh={freshIds.includes(slot.item.id)}
                  picked={picked.has(slot.item.id)}
                  selecting={selecting}
                  onOpen={onOpen}
                  onPick={onPick}
                  onReuse={onReuse}
                  onFavorite={onFavorite}
                  onDownload={onDownload}
                  onDelete={onDelete}
                />
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}

/* First run of the session. No placeholder scenery — the invitation carries
   itself, and the three starters are the only thing on the ground because they
   are the only thing here that is real: sample prompts, each showing the light
   its seed would make. One click loads the
   composer; pressing Generate stays the visitor’s call. Only the surface
   scopes offer them: a starter writes one surface’s prompt, and Assets and
   Favorites span both and are stocked from the other scopes, so they state the
   gesture instead. */
function Empty({
  view,
  surface,
  onStarter,
}: {
  view: GalleryView;
  surface: Surface;
  onStarter: (prompt: string) => void;
}) {
  const thumbRatio = surface === "image" ? "4 / 3" : "16 / 9";
  /* Reshuffled on every page load, and only after mount — picking during
     render would hand the hydrating client a different three than the server
     wrote. Until the picks land the server's three hold their space unseen, so
     the invitation never jumps up the panel to make room for them. */
  const [samples, setSamples] = useState<string[] | null>(null);
  useEffect(() => setSamples(pickSamples(surface)), [surface]);

  return (
    <div className="vt-empty">
      <div className="vt-empty-copy">
        <h2 className="vt-empty-title">{EMPTY[view].title}</h2>
        <p className="vt-empty-hint">{EMPTY[view].hint}</p>

        {!CROSS_VIEWS.has(view) && (
          <ul
            className="vt-empty-starters"
            style={samples ? undefined : { visibility: "hidden" }}
          >
            {(samples ?? SAMPLES[surface].slice(0, 3)).map((sample) => (
              <li key={sample}>
                <button type="button" className="vt-starter" onClick={() => onStarter(sample)}>
                  <span
                    className="vt-starter-thumb"
                    style={{ background: swatchFor(surface, sample), aspectRatio: thumbRatio }}
                  >
                    <span className="vt-grain" style={{ opacity: 0.24 }} />
                  </span>
                  <span className="vt-starter-text">{sample}</span>
                  <span className="vt-starter-go">
                    <ArrowRightIcon />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RunningTile({ run }: { run: ActiveRun }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - run.startedAt) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [run.startedAt]);

  return (
    <div
      className="vt-skeleton"
      role="status"
      aria-label={`${run.modelLabel} rendering`}
    >
      <span className="vt-skeleton-label">Rendering</span>
      <span className="vt-skeleton-clock">
        {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
      </span>
    </div>
  );
}

export function runSubtitle(item: RunRecord): string {
  return timeAgo(item.createdAt);
}
