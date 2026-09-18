"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";

import type { RunRecord } from "./history";
import { CheckIcon, CloseIcon, DownloadIcon, HeartIcon, PlayBadgeIcon, RejectIcon, TrashIcon } from "./icons";

/** How many runs the count stack shows before it stops drawing new sheets. */
const STACK = 3;

export interface SaveProgress {
  done: number;
  total: number;
}

/* The composer's replacement, not a second floating layer: while runs are
   picked the dock carries this instead, in the same slot and against the same
   bottom edge, so the swap reads as one control becoming another.

   It stays mounted once the studio has ever had a selection — the bar has to
   be present to animate away, and it needs the last non-empty selection to
   avoid flashing "0 selected" on its way out. */
export function SelectionBar({
  records,
  saving,
  onDownload,
  onFavorite,
  onReview,
  onDelete,
  onClose,
}: {
  records: RunRecord[];
  saving: SaveProgress | null;
  onDownload: () => void;
  onFavorite: () => void;
  onReview: (verdict: RunRecord["review"]) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const on = records.length > 0;
  /* The exiting bar keeps saying what it was acting on. */
  const held = useRef(records);
  if (on) held.current = records;
  const shown = held.current;

  const count = shown.length;
  const saveable = shown.filter((record) => record.urls[0]).length;
  const allKept = count > 0 && shown.every((record) => record.favorite === true);
  const allApproved = count > 0 && shown.every((record) => record.review === "approved");
  const allRejected = count > 0 && shown.every((record) => record.review === "rejected");
  const noun = count === 1 ? "run" : "runs";

  const downloadLabel = saving
    ? `Saving ${saving.done} of ${saving.total}`
    : saveable === 0
      ? "Nothing here to download"
      : saveable < count
        ? `Download ${saveable} of ${count}`
        : "Download";

  return (
    /* A labelled group rather than role="toolbar": the toolbar pattern promises
       arrow-key navigation between its controls, and four buttons the visitor
       can already tab through do not need a second set of keys to learn. */
    <div
      className="vt-selbar"
      role="group"
      aria-label="Bulk actions"
      data-on={on}
      inert={!on}
    >
      {/* Picking is done in the grid and reported here, so the count says so
          out loud rather than leaving the change silent. */}
      <p className="vt-selbar-count" role="status">
        <span className="vt-selstack" aria-hidden>
          {shown.slice(-STACK).map((record, index, sheets) => (
            <span
              key={record.id}
              className="vt-selchip"
              style={{ "--z": sheets.length - 1 - index, background: record.art } as CSSProperties}
            >
              {record.kind === "image" && record.urls[0] ? (
                /* Platform CDN host, same as the grid: next/image would need
                   every provider domain allow-listed up front. */
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={record.urls[0]} alt="" />
              ) : (
                record.kind === "video" && (
                  <span className="vt-selchip-play">
                    <PlayBadgeIcon size={7} />
                  </span>
                )
              )}
            </span>
          ))}
        </span>
        {/* One phrase, one flex item — the stack's gap must not open between
            the number and the word it counts. */}
        <span className="vt-selbar-text">
          <span className="vt-selbar-n" key={count}>
            {count}
          </span>{" "}
          selected
        </span>
      </p>

      <span className="vt-selbar-rule" aria-hidden />

      <span className="vt-selbar-slot vt-tip" data-tip={downloadLabel}>
        <button
          type="button"
          className="vt-selact vt-selact--wide"
          disabled={saveable === 0 || saving !== null}
          aria-label={downloadLabel}
          onClick={onDownload}
        >
          {saving ? <span className="vt-spinner" aria-hidden /> : <DownloadIcon size={15} />}
          <span className="vt-selact-label">
            {saving ? `${saving.done}/${saving.total}` : "Download"}
          </span>
        </button>
      </span>

      <button
        type="button"
        className="vt-selact vt-tip"
        data-tip={
          allKept ? `Remove ${count} ${noun} from favorites` : `Save ${count} ${noun} to favorites`
        }
        data-on={allKept}
        aria-pressed={allKept}
        aria-label={allKept ? "Remove from favorites" : "Save to favorites"}
        onClick={onFavorite}
      >
        <HeartIcon size={16} filled={allKept} />
      </button>

      <button
        type="button"
        className="vt-selact vt-selact--ok vt-tip"
        data-tip={allApproved ? `Unapprove ${count} ${noun}` : `Approve ${count} ${noun}`}
        data-on={allApproved}
        aria-pressed={allApproved}
        aria-label={allApproved ? "Unapprove" : "Approve"}
        onClick={() => onReview(allApproved ? "pending" : "approved")}
      >
        <CheckIcon size={15} />
      </button>

      <button
        type="button"
        className="vt-selact vt-tip"
        data-tip={allRejected ? `Clear rejection on ${count} ${noun}` : `Reject ${count} ${noun}`}
        data-on={allRejected}
        aria-pressed={allRejected}
        aria-label={allRejected ? "Clear rejection" : "Reject"}
        onClick={() => onReview(allRejected ? "pending" : "rejected")}
      >
        <RejectIcon size={15} />
      </button>

      <button
        type="button"
        className="vt-selact vt-selact--danger vt-tip"
        data-tip={`Delete ${count} ${noun}`}
        aria-label={`Delete ${count} ${noun}`}
        onClick={onDelete}
      >
        <TrashIcon size={15} />
      </button>

      <span className="vt-selbar-rule" aria-hidden />

      <button
        type="button"
        className="vt-selact vt-selact--quiet vt-tip vt-tip--end"
        data-tip="Clear selection · Esc"
        aria-label="Clear selection"
        onClick={onClose}
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
