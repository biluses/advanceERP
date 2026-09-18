import type { ModelEntry } from "@/generation/catalog/types";

import type { BrandKit } from "./brand";
import type { ProductFields } from "./brand";
import { resolveAspect, resolveDuration, type Channel } from "./channels";
import type { Preset } from "./presets";

export type PromptContext = {
  product: ProductFields | null;
  brand: BrandKit | null;
  channel: Channel | null;
  scene: string;
};

const TOKEN = /\{\{\s*([a-zA-Z.]+)\s*\}\}/g;

function clean(text: string | undefined | null): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function endsWithPunctuation(text: string): boolean {
  return /[.!?…]$/.test(text);
}

function sentence(text: string | undefined | null): string {
  const value = clean(text);
  if (!value) return "";
  return endsWithPunctuation(value) ? value : `${value}.`;
}

/** Every token a template can name, resolved from the context. Tokens that
    have nothing to say resolve to "" and the line they live on is dropped when
    nothing else on it resolved either. */
export function tokenValues(context: PromptContext): Record<string, string> {
  const { product, brand, channel } = context;
  const category = product?.category && product.category !== "Other" ? product.category.toLowerCase() : "";
  const features = product?.features?.length ? product.features.map(clean).filter(Boolean) : [];
  return {
    "product.name": clean(product?.name),
    "product.category": category,
    "product.categoryPhrase": category ? ` (${category})` : "",
    "product.description": sentence(product?.description),
    "product.appearance": product?.appearance ? sentence(`Appearance: ${clean(product.appearance)}`) : "",
    "product.features": features.length ? sentence(`Key features: ${features.join(", ")}`) : "",
    "brand.name": clean(brand?.name),
    "brand.tone": clean(brand?.tone),
    "brand.style": clean(brand?.style),
    "brand.styleLine": brand?.style ? sentence(`Visual style: ${clean(brand.style)}`) : "",
    "brand.paletteLine": brand?.palette?.length
      ? sentence(`Color palette leaning on ${brand.palette.join(", ")}`)
      : "",
    "brand.audienceLine": audienceLine(product, brand),
    "brand.avoid": brand?.avoid ? sentence(`Avoid: ${clean(brand.avoid)}`) : "",
    "channel.guidance": channel ? sentence(channel.guidance) : "",
    scene: clean(context.scene),
  };
}

function audienceLine(product: ProductFields | null, brand: BrandKit | null): string {
  const audience = clean(product?.audience) || clean(brand?.audience);
  return audience ? sentence(`Made to appeal to ${audience}`) : "";
}

/** Fold the context into the template. A line is kept when at least one of
    its tokens resolved or it carries no tokens; then whitespace is tidied and
    dangling connectors that a missing scene would leave behind are removed. */
export function compilePrompt(template: string, context: PromptContext): string {
  const values = tokenValues(context);
  const lines: string[] = [];
  for (const raw of template.split("\n")) {
    let resolvedAny = false;
    let hasToken = false;
    const line = raw.replace(TOKEN, (_match, key: string) => {
      hasToken = true;
      const value = values[key] ?? "";
      if (value) resolvedAny = true;
      return value;
    });
    if (hasToken && !resolvedAny) continue;
    const tidy = line
      .replace(/\s+([.,])/g, "$1")
      .replace(/\b(in|for|on|styled with|with)\s*[.,]/g, ".")
      .replace(/,\s*\./g, ".")
      .replace(/\.\s*\./g, ".")
      .replace(/\s+([.,])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    if (tidy) lines.push(tidy);
  }
  return lines.join(" ").trim();
}

/** The settings a job resolves to for a given model: the model's defaults,
    the preset's insistences, then the channel's ratio and length on top. Keys
    the catalog does not declare for this model are left out, so the result is
    always something parseSettings accepts. */
export function resolveSettings(
  model: ModelEntry,
  preset: Preset | null,
  channel: Channel | null,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const declared = model.settings;
  const apply = (patch: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(patch)) {
      const field = declared[key];
      if (!field) continue;
      if (field.type === "enum" && (typeof value !== "string" || !field.values.includes(value))) continue;
      if (field.type === "range" && (typeof value !== "number" || value < field.min || value > field.max)) continue;
      if (field.type === "boolean" && typeof value !== "boolean") continue;
      out[key] = value;
    }
  };
  apply(overrides);
  if (preset) apply(withoutKeys(preset.settings, Object.keys(overrides)));
  if (channel) {
    const aspect = resolveAspect(channel, model);
    if (aspect && overrides.aspectRatio === undefined) out.aspectRatio = aspect;
    const duration = resolveDuration(channel, model);
    if (duration !== null && overrides.duration === undefined) out.duration = duration;
  }
  return out;
}

function withoutKeys(record: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!keys.includes(key)) out[key] = value;
  }
  return out;
}

/** First model of the preset's preference list that the catalog carries. */
export function pickModel(preset: Preset, catalog: readonly ModelEntry[]): ModelEntry {
  for (const id of preset.models) {
    const model = catalog.find((entry) => entry.id === id && entry.surface === preset.surface);
    if (model) return model;
  }
  const fallback = catalog.find((entry) => entry.surface === preset.surface);
  if (!fallback) throw new Error(`No ${preset.surface} model in the catalog`);
  return fallback;
}
