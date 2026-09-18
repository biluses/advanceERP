import type { BrandKit, Product } from "@/domain/brand";
import { findPreset, type Preset } from "@/domain/presets";
import { compilePrompt, type PromptContext } from "@/domain/prompt";
import { CHANNELS, type Channel } from "@/domain/channels";
import type { MediaItem, MediaRole, ModelEntry } from "@/generation/catalog";

/** The skeleton a free prompt is folded into when no preset is chosen: the
    visitor's words lead, and whatever the product and brand know follows. */
export const FREE_TEMPLATE = ["{{scene}}", "{{product.appearance}}", "{{brand.styleLine}}", "{{brand.avoid}}"].join("\n");

export const PRODUCT_MEDIA_PREFIX = "product:";

export type Job = {
  product: Product | null;
  preset: Preset | null;
  channel: Channel | null;
};

export function resolveJob(
  products: Product[],
  ids: { productId: string | null; presetId: string | null; channelId: string | null },
): Job {
  return {
    product: products.find((entry) => entry.id === ids.productId) ?? null,
    preset: findPreset(ids.presetId),
    channel: CHANNELS.find((entry) => entry.id === ids.channelId) ?? null,
  };
}

/** What is actually sent for the words in the composer. */
export function finalPrompt(text: string, job: Job, brand: BrandKit | null): string {
  const context: PromptContext = {
    product: job.product,
    brand,
    channel: job.channel,
    scene: text,
  };
  if (job.preset) return compilePrompt(job.preset.template, context);
  return compilePrompt(FREE_TEMPLATE, context);
}

/** The product's photos, as media items under the role the preset wants —
    only the ones the model has room for. Marked so a later product swap can
    replace them without touching what the visitor attached by hand. */
export function productMedia(job: Job, model: ModelEntry): MediaItem[] {
  const role: MediaRole | null = job.preset?.productRole ?? (model.roles.reference ? "reference" : model.roles.start ? "start" : null);
  if (!job.product || !role || !model.roles[role]) return [];
  const cap = model.roles[role] ?? 0;
  return job.product.assets
    .filter((asset) => asset.kind === "image")
    .slice(0, cap)
    .map((asset) => ({ id: `${PRODUCT_MEDIA_PREFIX}${asset.id}`, url: asset.url, role }));
}

export function isProductMedia(item: MediaItem): boolean {
  return item.id.startsWith(PRODUCT_MEDIA_PREFIX);
}
