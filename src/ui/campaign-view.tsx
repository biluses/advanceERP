"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import type { BrandKit, Product } from "@/domain/brand";
import { getChannel, type Channel } from "@/domain/channels";
import { slugify } from "@/domain/brand";
import { findPreset, type Preset } from "@/domain/presets";
import { compilePrompt, pickModel, resolveSettings } from "@/domain/prompt";
import { creditsFor } from "@/domain/pricing";
import { MODELS, parseSettings } from "@/generation/catalog";
import type { MediaItem } from "@/generation/catalog";
import type { KeyStatus } from "@/generation/actions";
import type { Campaign } from "@/server/actions/campaigns";
import { deleteCampaign } from "@/server/actions/campaigns";
import type { RunRecord as ServerRunRecord } from "@/server/runs";
import { buildExport, saveBlob, type ExportProgress } from "@/studio/export";
import type { RunRecord } from "@/studio/history";
import { CheckIcon, DownloadIcon, PlayBadgeIcon, RejectIcon, RetryIcon, WarningIcon } from "@/studio/icons";
import { useGeneration } from "@/studio/use-generation";
import { Viewer } from "@/studio/viewer";

type Pair = { preset: Preset; channel: Channel };

function pairsOf(campaign: Campaign): Pair[] {
  const out: Pair[] = [];
  for (const presetId of campaign.presetIds) {
    const preset = findPreset(presetId);
    if (!preset) continue;
    for (const channelId of campaign.channelIds) {
      const channel = getChannel(channelId);
      if (channel.surfaces.includes(preset.surface)) out.push({ preset, channel });
    }
  }
  return out;
}

export function CampaignView({
  campaign,
  product,
  brand,
  runs,
  credits,
  keyStatus,
}: {
  campaign: Campaign;
  product: Product;
  brand: BrandKit;
  runs: ServerRunRecord[];
  credits: number;
  keyStatus: KeyStatus;
}) {
  const router = useRouter();
  const gen = useGeneration(runs, credits);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportProgress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pairs = useMemo(() => pairsOf(campaign), [campaign]);

  /* What one press costs, before it is pressed. */
  const estimate = useMemo(
    () =>
      pairs.reduce((total, pair) => {
        const model = pickModel(pair.preset, MODELS);
        return total + creditsFor(model, parseSettings(model, resolveSettings(model, pair.preset, pair.channel)));
      }, 0),
    [pairs],
  );

  const generateAll = useCallback(async () => {
    if (keyStatus.mode === "none") {
      gen.setError("No platform key is set. Add yours in Settings to generate.");
      return;
    }
    await Promise.all(
      pairs.map(({ preset, channel }) => {
        const model = pickModel(preset, MODELS);
        const settings = parseSettings(model, resolveSettings(model, preset, channel));
        const text = compilePrompt(preset.template, { product, brand, channel, scene: campaign.scene });
        const media: Record<string, MediaItem[]> = {};
        const role = preset.productRole;
        if (role && model.roles[role]) {
          const photos = product.assets.filter((asset) => asset.kind === "image").slice(0, model.roles[role]);
          if (photos.length) media[role] = photos.map((asset) => ({ id: `product:${asset.id}`, url: asset.url, role }));
        }
        return gen.generate({
          plane: { model: model.id, prompt: { text }, media, settings },
          context: { productId: product.id, campaignId: campaign.id, presetId: preset.id, channelId: channel.id, scene: campaign.scene },
          batch: 1,
        });
      }),
    );
  }, [pairs, keyStatus.mode, gen, product, brand, campaign]);

  const byChannel = useMemo(() => {
    const groups = new Map<string, RunRecord[]>();
    for (const run of gen.history) {
      if (run.campaignId !== campaign.id) continue;
      const key = run.channelId ?? "studio";
      groups.set(key, [...(groups.get(key) ?? []), run]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [gen.history, campaign.id]);

  const approved = useMemo(
    () => gen.history.filter((run) => run.campaignId === campaign.id && run.review === "approved" && run.urls[0]),
    [gen.history, campaign.id],
  );
  const finished = gen.history.filter((run) => run.campaignId === campaign.id && run.status === "completed").length;

  const exportApproved = useCallback(async () => {
    if (approved.length === 0) return;
    setNotice(null);
    setExporting({ done: 0, total: approved.length });
    const { blob, refused } = await buildExport(
      approved.map((run, index) => ({
        brand: brand.name || "brand",
        product: product.name,
        channelTag: run.channelId ? getChannel(run.channelId).tag : null,
        presetId: run.presetId,
        url: run.urls[0]!,
        kind: run.kind,
        index,
      })),
      setExporting,
    );
    setExporting(null);
    saveBlob(blob, `${slugify(campaign.name, "campaign")}-export.zip`);
    if (refused.length) setNotice(`${refused.length} of ${approved.length} files could not be read from the platform CDN and were left out.`);
  }, [approved, brand.name, product.name, campaign.name]);

  const viewerItem = viewerId ? (gen.history.find((run) => run.id === viewerId) ?? null) : null;
  const running = gen.busy;

  return (
    <div className="vt-page vt-page--campaign">
      <header className="vt-page-head">
        <div>
          <p className="vt-page-crumb">
            <Link href="/app/campaigns">Campaigns</Link>
          </p>
          <h1 className="vt-page-title">{campaign.name}</h1>
          <p className="vt-page-copy">
            {product.name}
            {campaign.scene ? ` · ${campaign.scene}` : ""}
          </p>
        </div>
        <div className="vt-page-actions">
          <button
            type="button"
            className="vt-btn-solid"
            disabled={approved.length === 0 || exporting !== null}
            onClick={() => void exportApproved()}
            title={approved.length === 0 ? "Approve runs to export them" : `Export ${approved.length} approved files`}
          >
            <DownloadIcon size={14} />
            {exporting ? `Exporting ${exporting.done}/${exporting.total}` : `Export ${approved.length} approved`}
          </button>
          <button type="button" className="vt-cta" disabled={running || pairs.length === 0} onClick={() => void generateAll()}>
            <RetryIcon size={14} />
            {running ? "Generating…" : `Generate ${pairs.length} run${pairs.length === 1 ? "" : "s"}`}
            {keyStatus.mode !== "byok" && !running && <span className="vt-cta-note">≈ {estimate} credits</span>}
          </button>
        </div>
      </header>

      {gen.error && (
        <div className="vt-alert" role="alert">
          <span className="vt-alert-ic">
            <WarningIcon />
          </span>
          <span className="vt-alert-text">{gen.error}</span>
          <button type="button" className="vt-btn-quiet" onClick={() => gen.setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {notice && (
        <div className="vt-alert" role="status">
          <span className="vt-alert-text">{notice}</span>
        </div>
      )}

      {product.assets.length === 0 && (
        <div className="vt-alert" role="status">
          <span className="vt-alert-text">
            This product has no photo yet, so presets will work from the description alone. <Link href={`/app/products/${product.id}`}>Add a photo</Link> for
            results that match the real product.
          </span>
        </div>
      )}

      <section className="vt-campaign-plan">
        <h2 className="vt-panel-title">Plan</h2>
        <ul className="vt-pairs">
          {pairs.map(({ preset, channel }) => {
            const model = pickModel(preset, MODELS);
            const settings = parseSettings(model, resolveSettings(model, preset, channel));
            return (
              <li key={`${preset.id}:${channel.id}`} className="vt-pair">
                <span className="vt-pair-preset">{preset.label}</span>
                <span className="vt-pair-arrow" aria-hidden>
                  →
                </span>
                <span className="vt-pair-channel">{channel.label}</span>
                <span className="vt-pair-meta">
                  {model.label}
                  {settings.aspectRatio ? ` · ${String(settings.aspectRatio)}` : ""}
                  {typeof settings.duration === "number" ? ` · ${settings.duration}s` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="vt-campaign-results">
        <div className="vt-panel-head vt-panel-head--row">
          <h2 className="vt-panel-title">Results</h2>
          <span className="vt-panel-copy">
            {finished} finished · {approved.length} approved
          </span>
        </div>
        {byChannel.length === 0 && gen.runs.length === 0 ? (
          <p className="vt-panel-note">Nothing generated yet. Press Generate to run the whole plan.</p>
        ) : (
          <>
            {gen.runs.length > 0 && (
              <div className="vt-channel-group">
                <h3 className="vt-channel-title">Submitting…</h3>
                <ul className="vt-result-grid">
                  {gen.runs.map((run) => (
                    <li key={run.id} className="vt-result vt-result--running" style={{ aspectRatio: run.ratio }}>
                      <span className="vt-skeleton-label">Queued</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {byChannel.map(([channelId, list]) => (
              <div key={channelId} className="vt-channel-group">
                <h3 className="vt-channel-title">{channelId === "studio" ? "Studio" : getChannel(channelId).label}</h3>
                <ul className="vt-result-grid">
                  {list.map((run) => (
                    <li key={run.id} className="vt-result" data-status={run.status} data-review={run.review} style={{ aspectRatio: run.ratio }}>
                      {run.status === "running" ? (
                        <span className="vt-skeleton-label">Rendering</span>
                      ) : run.status === "failed" ? (
                        <span className="vt-result-fail">
                          <WarningIcon />
                          <span>{run.error}</span>
                        </span>
                      ) : (
                        <button type="button" className="vt-result-open" onClick={() => setViewerId(run.id)} aria-label={`Open ${run.prompt}`}>
                          {run.kind === "video" ? (
                            <video src={run.urls[0]} muted loop playsInline preload="metadata" />
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={run.urls[0]} alt={run.prompt} loading="lazy" />
                          )}
                          {run.kind === "video" && run.badge && (
                            <span className="vt-tile-badge">
                              <PlayBadgeIcon />
                              {run.badge}
                            </span>
                          )}
                        </button>
                      )}
                      {run.status === "completed" && (
                        <span className="vt-result-acts">
                          <span className="vt-result-preset">{findPreset(run.presetId)?.label ?? "Run"}</span>
                          <button
                            type="button"
                            className="vt-review-btn vt-review-btn--mini"
                            data-kind="approve"
                            data-on={run.review === "approved"}
                            aria-pressed={run.review === "approved"}
                            aria-label="Approve"
                            onClick={() => gen.review([run.id], run.review === "approved" ? "pending" : "approved")}
                          >
                            <CheckIcon size={12} />
                          </button>
                          <button
                            type="button"
                            className="vt-review-btn vt-review-btn--mini"
                            data-kind="reject"
                            data-on={run.review === "rejected"}
                            aria-pressed={run.review === "rejected"}
                            aria-label="Reject"
                            onClick={() => gen.review([run.id], run.review === "rejected" ? "pending" : "rejected")}
                          >
                            <RejectIcon size={12} />
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </section>

      <footer className="vt-page-foot">
        <button
          type="button"
          className="vt-btn-quiet vt-btn-danger"
          onClick={() => {
            if (!window.confirm(`Delete “${campaign.name}”? Its runs stay in the gallery.`)) return;
            void deleteCampaign(campaign.id).then(() => {
              router.push("/app/campaigns");
              router.refresh();
            });
          }}
        >
          Delete campaign
        </button>
      </footer>

      {viewerItem && viewerItem.status !== "running" && (
        <Viewer
          item={viewerItem}
          product={product}
          onClose={() => setViewerId(null)}
          onReuse={() => setViewerId(null)}
          onFavorite={() => gen.toggleFavorite(viewerItem)}
          onReview={(verdict) => gen.review([viewerItem.id], verdict)}
          onDelete={() => {
            setViewerId(null);
            gen.remove([viewerItem]);
          }}
        />
      )}
    </div>
  );
}
