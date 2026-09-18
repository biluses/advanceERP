"use client";

import { useEffect, useRef, useState } from "react";

import type { Product } from "@/domain/brand";
import { CHANNELS, channelsFor } from "@/domain/channels";
import { PRESETS, findPreset, presetsFor } from "@/domain/presets";
import { pickModel } from "@/domain/prompt";
import { MODELS, type Surface } from "@/generation/catalog";
import { useActive } from "@/generation/stores/active";

import { CaretDownIcon, CheckIcon, CloseIcon, SearchIcon } from "./icons";
import type { Job } from "./job";
import { useJob } from "./stores/job";

export const JOB_PRODUCT = "job:product";
export const JOB_PRESET = "job:preset";
export const JOB_CHANNEL = "job:channel";

/** The three choices that set the composer up for a job. Each is a pill that
    opens a list; "none" is always an option so a free prompt stays one press
    away. */
export function JobRail({
  surface,
  products,
  job,
  overlay,
  onOpen,
}: {
  surface: Surface;
  products: Product[];
  job: Job;
  overlay: string | null;
  onOpen: (id: string, trigger: HTMLElement) => void;
}) {
  const hasProducts = products.length > 0;
  return (
    <div className="vt-jobrail" role="group" aria-label="Job">
      <JobPill
        id={JOB_PRODUCT}
        label="Product"
        value={job.product?.name ?? (hasProducts ? "No product" : "Add a product")}
        empty={!job.product}
        open={overlay === JOB_PRODUCT}
        thumb={job.product?.assets[0]?.url}
        onOpen={onOpen}
        href={hasProducts ? undefined : "/app/products"}
      />
      <JobPill
        id={JOB_PRESET}
        label="Preset"
        value={job.preset?.label ?? "Free prompt"}
        empty={!job.preset}
        open={overlay === JOB_PRESET}
        onOpen={onOpen}
      />
      <JobPill
        id={JOB_CHANNEL}
        label="Channel"
        value={job.channel?.label ?? "Any channel"}
        empty={!job.channel}
        open={overlay === JOB_CHANNEL}
        onOpen={onOpen}
      />
      <span className="vt-jobrail-hint" aria-hidden>
        {surface === "image" ? "Image" : "Video"}
      </span>
    </div>
  );
}

function JobPill({
  id,
  label,
  value,
  empty,
  open,
  thumb,
  href,
  onOpen,
}: {
  id: string;
  label: string;
  value: string;
  empty: boolean;
  open: boolean;
  thumb?: string;
  href?: string;
  onOpen: (id: string, trigger: HTMLElement) => void;
}) {
  const body = (
    <>
      {thumb && (
        /* Product photo the visitor uploaded; an arbitrary host for a 16px thumb. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="vt-jobpill-thumb" src={thumb} alt="" />
      )}
      <span className="vt-jobpill-label">{label}</span>
      <span className="vt-jobpill-value">{value}</span>
      <span className="vt-caret">
        <CaretDownIcon />
      </span>
    </>
  );
  if (href) {
    return (
      <a className="vt-jobpill" data-empty={empty} href={href} title="Add your first product">
        {body}
      </a>
    );
  }
  return (
    <button
      type="button"
      className="vt-jobpill vt-tip"
      data-tip={`Change ${label.toLowerCase()}`}
      data-empty={empty}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={(event) => onOpen(id, event.currentTarget)}
    >
      {body}
    </button>
  );
}

type Row = { id: string | null; title: string; desc?: string; thumb?: string; dim?: boolean };

function JobList({
  title,
  rows,
  selected,
  searchable,
  onPick,
  onClose,
}: {
  title: string;
  rows: Row[];
  selected: string | null;
  searchable?: boolean;
  onPick: (id: string | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const query = search.trim().toLowerCase();
  const shown = query ? rows.filter((row) => `${row.title} ${row.desc ?? ""}`.toLowerCase().includes(query)) : rows;

  return (
    <div className="vt-popover vt-popover--picker vt-popover--job" role="dialog" aria-label={title}>
      <div className="vt-picker-head">
        {searchable ? (
          <>
            <span className="vt-picker-search-ic" aria-hidden>
              <SearchIcon size={16} />
            </span>
            <input
              ref={inputRef}
              className="vt-picker-input"
              value={search}
              placeholder={`Search ${title.toLowerCase()}`}
              aria-label={`Search ${title.toLowerCase()}`}
              onChange={(event) => setSearch(event.target.value)}
            />
          </>
        ) : (
          <span className="vt-pop-head vt-picker-group vt-picker-title">{title}</span>
        )}
        <button type="button" className="vt-icon-btn vt-icon-btn--ghost vt-picker-close" aria-label="Close" onClick={onClose}>
          <CloseIcon size={13} />
        </button>
      </div>
      <div className="vt-picker-list vt-scroll">
        {shown.map((row) => {
          const active = row.id === selected;
          return (
            <button
              key={row.id ?? "__none"}
              type="button"
              className="vt-model-row"
              data-dim={row.dim || undefined}
              aria-current={active || undefined}
              onClick={() => onPick(row.id)}
            >
              {row.thumb ? (
                <span className="vt-model-row-swatch vt-model-row-swatch--icon">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="vt-jobrow-thumb" src={row.thumb} alt="" />
                </span>
              ) : (
                <span className="vt-model-row-swatch vt-model-row-swatch--blank" />
              )}
              <span className="vt-model-row-text">
                <span className="vt-model-row-name">{row.title}</span>
                {row.desc && <span className="vt-model-row-desc">{row.desc}</span>}
              </span>
              <span className="vt-model-row-check" aria-hidden>
                {active && <CheckIcon />}
              </span>
            </button>
          );
        })}
        {shown.length === 0 && <div className="vt-picker-empty">Nothing matches “{search.trim()}”</div>}
      </div>
    </div>
  );
}

export function JobPicker({
  which,
  surface,
  products,
  job,
  onClose,
}: {
  which: string;
  surface: Surface;
  products: Product[];
  job: Job;
  onClose: () => void;
}) {
  const setProduct = useJob((state) => state.setProduct);
  const setPreset = useJob((state) => state.setPreset);
  const setChannel = useJob((state) => state.setChannel);

  if (which === JOB_PRODUCT) {
    const rows: Row[] = [
      { id: null, title: "No product", desc: "Generate from the prompt alone" },
      ...products.map((product) => ({
        id: product.id,
        title: product.name,
        desc: [product.category !== "Other" ? product.category : null, `${product.assets.length} photo${product.assets.length === 1 ? "" : "s"}`]
          .filter(Boolean)
          .join(" · "),
        thumb: product.assets[0]?.url,
      })),
    ];
    return (
      <JobList
        title="Products"
        rows={rows}
        selected={job.product?.id ?? null}
        searchable={products.length > 6}
        onPick={(id) => {
          setProduct(id);
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  if (which === JOB_PRESET) {
    const here = presetsFor(surface);
    const other = PRESETS.filter((preset) => preset.surface !== surface);
    const rows: Row[] = [
      { id: null, title: "Free prompt", desc: "Your words, with the product and brand folded in" },
      ...here.map((preset) => ({ id: preset.id, title: preset.label, desc: preset.description })),
      ...other.map((preset) => ({
        id: preset.id,
        title: preset.label,
        desc: `${preset.surface === "image" ? "Image" : "Video"} · ${preset.description}`,
        dim: true,
      })),
    ];
    return (
      <JobList
        title="Presets"
        rows={rows}
        selected={job.preset?.id ?? null}
        searchable
        onPick={(id) => {
          setPreset(id);
          /* The preset knows which models do its job well; the first one the
             catalog carries becomes the composer's, still free to change. */
          const preset = findPreset(id);
          if (preset) useActive.getState().setModel(pickModel(preset, MODELS).id);
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  const here = channelsFor(surface);
  const other = CHANNELS.filter((channel) => !channel.surfaces.includes(surface));
  const rows: Row[] = [
    { id: null, title: "Any channel", desc: "Keep the model's own ratio and length" },
    ...here.map((channel) => ({
      id: channel.id,
      title: channel.label,
      desc: `${channel.network} · ${channel.aspects[0]}${channel.video ? ` · ${channel.video.preferred}s` : ""}`,
    })),
    ...other.map((channel) => ({ id: channel.id, title: channel.label, desc: `${channel.network} · not for ${surface}`, dim: true })),
  ];
  return (
    <JobList
      title="Channels"
      rows={rows}
      selected={job.channel?.id ?? null}
      onPick={(id) => {
        setChannel(id);
        onClose();
      }}
      onClose={onClose}
    />
  );
}
