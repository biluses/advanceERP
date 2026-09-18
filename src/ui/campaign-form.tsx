"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { Product } from "@/domain/brand";
import { CHANNELS, type ChannelId } from "@/domain/channels";
import { PRESETS } from "@/domain/presets";
import { createCampaign } from "@/server/actions/campaigns";

export function CampaignForm({ products, initialProductId }: { products: Product[]; initialProductId: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [productId, setProductId] = useState(initialProductId ?? products[0]?.id ?? "");
  const [scene, setScene] = useState("");
  const [presetIds, setPresetIds] = useState<string[]>(["pack-shot", "lifestyle-scene"]);
  const [channelIds, setChannelIds] = useState<ChannelId[]>(["instagram_feed", "amazon_listing"]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const toggle = <T extends string>(list: T[], id: T): T[] => (list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]);

  /* A preset and a channel only pair when they share a surface — a TikTok
     pack shot is not a thing. The count says how many runs the press makes. */
  const pairs = presetIds.flatMap((presetId) => {
    const preset = PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return [];
    return channelIds.filter((channelId) => CHANNELS.find((entry) => entry.id === channelId)?.surfaces.includes(preset.surface));
  }).length;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const result = await createCampaign({ name, productId, scene, presetIds, channelIds });
    setBusy(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    router.push(`/app/campaigns/${result.value.id}`);
  }

  return (
    <form className="vt-form vt-form--wide" onSubmit={(event) => void onSubmit(event)}>
      <div className="vt-form-cols">
        <div className="vt-form-col">
          <label className="vt-field">
            <span className="vt-field-label">Campaign name</span>
            <input className="vt-input" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} placeholder="Spring launch" />
            {errors.name && <span className="vt-field-error">{errors.name}</span>}
          </label>
          <label className="vt-field">
            <span className="vt-field-label">Product</span>
            <select className="vt-input" value={productId} onChange={(event) => setProductId(event.target.value)} required>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            {errors.productId && <span className="vt-field-error">{errors.productId}</span>}
          </label>
          <label className="vt-field">
            <span className="vt-field-label">Scene</span>
            <textarea
              className="vt-input vt-textarea"
              value={scene}
              onChange={(event) => setScene(event.target.value)}
              rows={3}
              maxLength={400}
              placeholder="a bright scandinavian kitchen at breakfast, morning light"
            />
            <span className="vt-field-hint">One scene for the whole campaign; each preset frames it its own way.</span>
          </label>
        </div>
        <div className="vt-form-col">
          <fieldset className="vt-field">
            <legend className="vt-field-label">Presets</legend>
            <ul className="vt-checks">
              {PRESETS.map((preset) => (
                <li key={preset.id}>
                  <label className="vt-check">
                    <input type="checkbox" checked={presetIds.includes(preset.id)} onChange={() => setPresetIds((prev) => toggle(prev, preset.id))} />
                    <span className="vt-check-text">
                      <span className="vt-check-title">
                        {preset.label} <em>{preset.surface}</em>
                      </span>
                      <span className="vt-check-desc">{preset.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {errors.presetIds && <span className="vt-field-error">{errors.presetIds}</span>}
          </fieldset>
          <fieldset className="vt-field">
            <legend className="vt-field-label">Channels</legend>
            <ul className="vt-checks vt-checks--compact">
              {CHANNELS.map((channel) => (
                <li key={channel.id}>
                  <label className="vt-check">
                    <input type="checkbox" checked={channelIds.includes(channel.id)} onChange={() => setChannelIds((prev) => toggle(prev, channel.id))} />
                    <span className="vt-check-text">
                      <span className="vt-check-title">
                        {channel.label} <em>{channel.aspects[0]}</em>
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {errors.channelIds && <span className="vt-field-error">{errors.channelIds}</span>}
          </fieldset>
        </div>
      </div>
      <div className="vt-form-actions">
        <span className="vt-form-note">
          {pairs} run{pairs === 1 ? "" : "s"} per generate — one per preset and channel that fit together.
        </span>
        <span className="vt-form-spacer" />
        <button type="submit" className="vt-cta" disabled={busy || products.length === 0}>
          {busy ? "Creating…" : "Create campaign"}
        </button>
      </div>
    </form>
  );
}
