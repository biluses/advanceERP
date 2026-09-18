"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PRODUCT_CATEGORIES, linesToList, type Product, type ProductInput } from "@/domain/brand";
import { uploadMedia } from "@/generation/upload";
import { addProductAsset, archiveProduct, createProduct, removeProductAsset, updateProduct } from "@/server/actions/products";
import { CloseIcon, PlusIcon } from "@/studio/icons";

type Draft = {
  name: string;
  category: string;
  description: string;
  features: string;
  appearance: string;
  audience: string;
  priceLabel: string;
};

function draftOf(product: Product | null): Draft {
  return {
    name: product?.name ?? "",
    category: product?.category ?? "Other",
    description: product?.description ?? "",
    features: product?.features.join("\n") ?? "",
    appearance: product?.appearance ?? "",
    audience: product?.audience ?? "",
    priceLabel: product?.priceLabel ?? "",
  };
}

export function ProductEditor({ product }: { product: Product | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => draftOf(product));
  const [assets, setAssets] = useState(product?.assets ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key: keyof Draft) => (event: { target: { value: string } }) => {
    setSaved(false);
    setDraft((prev) => ({ ...prev, [key]: event.target.value }));
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const input: ProductInput = {
      name: draft.name,
      category: draft.category as ProductInput["category"],
      description: draft.description,
      features: linesToList(draft.features),
      appearance: draft.appearance,
      audience: draft.audience,
      priceLabel: draft.priceLabel,
    };
    const result = product ? await updateProduct(product.id, input) : await createProduct(input);
    setBusy(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSaved(true);
    if (!product) {
      router.push(`/app/products/${result.value.id}`);
      return;
    }
    router.refresh();
  }

  async function onPhoto(file: File | undefined) {
    if (!file || !product) return;
    setUploading(true);
    setErrors({});
    try {
      const uploaded = await uploadMedia(file);
      const asset = await addProductAsset(product.id, { url: uploaded.url, kind: "image", name: file.name });
      setAssets((prev) => [...prev, asset]);
      router.refresh();
    } catch (caught) {
      setErrors({ photos: caught instanceof Error ? caught.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  async function onRemovePhoto(assetId: string) {
    if (!product) return;
    setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
    await removeProductAsset(product.id, assetId);
    router.refresh();
  }

  async function onArchive() {
    if (!product) return;
    if (!window.confirm(`Archive “${product.name}”? Its runs stay in the gallery.`)) return;
    await archiveProduct(product.id);
    router.push("/app/products");
    router.refresh();
  }

  return (
    <form className="vt-form vt-form--wide" onSubmit={(event) => void onSubmit(event)}>
      <div className="vt-form-cols">
        <div className="vt-form-col">
          <label className="vt-field">
            <span className="vt-field-label">Name</span>
            <input className="vt-input" value={draft.name} onChange={set("name")} required maxLength={120} placeholder="Aurora ceramic mug" />
            {errors.name && <span className="vt-field-error">{errors.name}</span>}
          </label>

          <label className="vt-field">
            <span className="vt-field-label">Category</span>
            <select className="vt-input" value={draft.category} onChange={set("category")}>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="vt-field">
            <span className="vt-field-label">How it looks</span>
            <textarea
              className="vt-input vt-textarea"
              value={draft.appearance}
              onChange={set("appearance")}
              rows={3}
              maxLength={300}
              placeholder="matte sage green glaze, speckled, natural clay rim — what the model must get right"
            />
            <span className="vt-field-hint">Goes into every prompt. Materials, colorway, finish, shape.</span>
          </label>

          <label className="vt-field">
            <span className="vt-field-label">Description</span>
            <textarea className="vt-input vt-textarea" value={draft.description} onChange={set("description")} rows={3} maxLength={600} />
          </label>

          <label className="vt-field">
            <span className="vt-field-label">Key features — one per line</span>
            <textarea className="vt-input vt-textarea" value={draft.features} onChange={set("features")} rows={3} placeholder={"350 ml\ndishwasher safe"} />
          </label>

          <div className="vt-form-row">
            <label className="vt-field">
              <span className="vt-field-label">Audience</span>
              <input className="vt-input" value={draft.audience} onChange={set("audience")} maxLength={200} placeholder="design-conscious home cooks" />
            </label>
            <label className="vt-field vt-field--short">
              <span className="vt-field-label">Price label</span>
              <input className="vt-input" value={draft.priceLabel} onChange={set("priceLabel")} maxLength={40} placeholder="€24" />
            </label>
          </div>
        </div>

        <div className="vt-form-col">
          <div className="vt-field">
            <span className="vt-field-label">Photos</span>
            {product ? (
              <>
                <ul className="vt-photo-grid">
                  {assets.map((asset) => (
                    <li key={asset.id} className="vt-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt={asset.name} />
                      <button type="button" className="vt-photo-remove" aria-label={`Remove ${asset.name}`} onClick={() => void onRemovePhoto(asset.id)}>
                        <CloseIcon size={10} />
                      </button>
                    </li>
                  ))}
                  <li className="vt-photo vt-photo--add">
                    <label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        disabled={uploading}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          void onPhoto(file);
                        }}
                      />
                      {uploading ? <span className="vt-spinner" aria-hidden /> : <PlusIcon size={16} />}
                      <span>{uploading ? "Uploading" : "Add photo"}</span>
                    </label>
                  </li>
                </ul>
                <span className="vt-field-hint">
                  The first photo is the reference every preset starts from. Clean, well-lit, product filling the frame.
                </span>
              </>
            ) : (
              <span className="vt-field-hint">Save the product first, then add its photos.</span>
            )}
            {errors.photos && <span className="vt-field-error">{errors.photos}</span>}
          </div>
        </div>
      </div>

      {errors.form && (
        <div className="vt-alert" role="alert">
          <span className="vt-alert-text">{errors.form}</span>
        </div>
      )}

      <div className="vt-form-actions">
        {product && (
          <button type="button" className="vt-btn-quiet vt-btn-danger" onClick={() => void onArchive()}>
            Archive product
          </button>
        )}
        <span className="vt-form-spacer" />
        {saved && <span className="vt-form-saved">Saved</span>}
        <button type="submit" className="vt-cta" disabled={busy}>
          {busy ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}
