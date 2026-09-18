"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { BrandKit } from "@/domain/brand";
import { saveBrandKit } from "@/server/actions/brand";

const MAX_COLORS = 6;

export function BrandEditor({ brand }: { brand: BrandKit }) {
  const router = useRouter();
  const [draft, setDraft] = useState<BrandKit>(brand);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key: keyof BrandKit) => (event: { target: { value: string } }) => {
    setSaved(false);
    setDraft((prev) => ({ ...prev, [key]: event.target.value }));
  };

  function setColor(index: number, value: string) {
    setSaved(false);
    setDraft((prev) => {
      const palette = [...prev.palette];
      palette[index] = value;
      return { ...prev, palette };
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const result = await saveBrandKit({ ...draft, palette: draft.palette.filter(Boolean) });
    setBusy(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setDraft(result.value);
    setSaved(true);
    router.refresh();
  }

  return (
    <form className="vt-form vt-form--wide" onSubmit={(event) => void onSubmit(event)}>
      <div className="vt-form-cols">
        <div className="vt-form-col">
          <label className="vt-field">
            <span className="vt-field-label">Brand name</span>
            <input className="vt-input" value={draft.name} onChange={set("name")} required maxLength={80} />
            {errors.name && <span className="vt-field-error">{errors.name}</span>}
          </label>
          <label className="vt-field">
            <span className="vt-field-label">Tagline</span>
            <input className="vt-input" value={draft.tagline} onChange={set("tagline")} maxLength={160} />
          </label>
          <label className="vt-field">
            <span className="vt-field-label">Visual style</span>
            <textarea
              className="vt-input vt-textarea"
              value={draft.style}
              onChange={set("style")}
              rows={3}
              maxLength={240}
              placeholder="minimal scandinavian, soft daylight, natural materials"
            />
            <span className="vt-field-hint">Folded into every prompt as “Visual style: …”.</span>
          </label>
          <label className="vt-field">
            <span className="vt-field-label">Tone of voice</span>
            <input className="vt-input" value={draft.tone} onChange={set("tone")} maxLength={160} placeholder="warm, confident, a little playful" />
          </label>
        </div>
        <div className="vt-form-col">
          <div className="vt-field">
            <span className="vt-field-label">Palette</span>
            <div className="vt-palette">
              {Array.from({ length: MAX_COLORS }, (_, index) => {
                const value = draft.palette[index] ?? "";
                return (
                  <label key={index} className="vt-swatch" data-empty={!value || undefined}>
                    <input
                      type="color"
                      value={value || "#888888"}
                      onChange={(event) => setColor(index, event.target.value)}
                      aria-label={`Color ${index + 1}`}
                    />
                    <span className="vt-swatch-chip" style={{ background: value || "transparent" }} />
                    <span className="vt-swatch-hex">{value || "—"}</span>
                    {value && (
                      <button type="button" className="vt-swatch-clear" onClick={() => setColor(index, "")} aria-label="Clear color">
                        ×
                      </button>
                    )}
                  </label>
                );
              })}
            </div>
            {errors["palette"] && <span className="vt-field-error">{errors["palette"]}</span>}
          </div>
          <label className="vt-field">
            <span className="vt-field-label">Audience</span>
            <input className="vt-input" value={draft.audience} onChange={set("audience")} maxLength={200} placeholder="urban runners 25–40" />
          </label>
          <label className="vt-field">
            <span className="vt-field-label">Never show</span>
            <textarea
              className="vt-input vt-textarea"
              value={draft.avoid}
              onChange={set("avoid")}
              rows={2}
              maxLength={240}
              placeholder="text, other brands, clutter"
            />
            <span className="vt-field-hint">Appended to every prompt as “Avoid: …”.</span>
          </label>
        </div>
      </div>

      <div className="vt-form-actions">
        <span className="vt-form-spacer" />
        {saved && <span className="vt-form-saved">Saved</span>}
        <button type="submit" className="vt-cta" disabled={busy}>
          {busy ? "Saving…" : "Save brand kit"}
        </button>
      </div>
    </form>
  );
}
