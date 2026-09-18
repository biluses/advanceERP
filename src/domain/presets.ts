import type { Surface } from "@/generation/catalog/types";

import type { ChannelId } from "./channels";

export type PresetCategory = "studio" | "lifestyle" | "social" | "video";

/** A preset is one job an e-commerce team asks for by name — "pack shot",
    "lifestyle scene", "product spin". It carries the prompt skeleton, the
    models known to do it well and the settings that job needs. The catalog
    still decides what each model can take; a preset only chooses. */
export type Preset = {
  id: string;
  label: string;
  description: string;
  surface: Surface;
  category: PresetCategory;
  /** Models in order of preference. The first one present in the catalog is
      used, so a catalog that loses a model degrades to the next. */
  models: readonly string[];
  /** Settings the job insists on, applied over the model's defaults and under
      what the channel resolves. Keys the model does not declare are dropped. */
  settings: Record<string, unknown>;
  /** Prompt skeleton. Lines whose tokens all resolve empty are dropped. */
  template: string;
  /** Media role the product photo is attached under, when the preset is
      built on a real photo of the product rather than a description. */
  productRole: "reference" | "start" | null;
  /** What the scene field asks for, and an example. */
  scenePlaceholder: string;
  sceneExamples: readonly string[];
  channels: readonly ChannelId[];
};

const IMAGE_MODELS = ["flux-2", "qwen-image-3", "z-image-turbo", "grok-imagine-2", "ideogram-4", "recraft-4.1"];
const VIDEO_MODELS = ["seedance-2.5", "seedance-2", "kling-3-std", "kling-3-turbo", "wan-3", "minimax-hailuo-2.3"];

export const PRESETS: readonly Preset[] = [
  {
    id: "pack-shot",
    label: "Pack shot",
    description: "The product alone on seamless white — the marketplace main image.",
    surface: "image",
    category: "studio",
    models: IMAGE_MODELS,
    settings: { resolution: "2k" },
    template: [
      "Professional e-commerce product photograph of {{product.name}}{{product.categoryPhrase}}.",
      "{{product.appearance}}",
      "Seamless pure white studio background, soft even lighting from a large softbox, subtle natural contact shadow, sharp focus across the whole product, true-to-life colors.",
      "Product exactly as in the reference photo, centered, filling most of the frame, no props, no text, no logo overlays.",
      "{{brand.avoid}}",
    ].join("\n"),
    productRole: "reference",
    scenePlaceholder: "Optional angle or detail — front three-quarter view, lid open…",
    sceneExamples: ["front three-quarter view", "top-down flat view", "close on the label"],
    channels: ["amazon_listing", "shopify_hero", "instagram_feed"],
  },
  {
    id: "lifestyle-scene",
    label: "Lifestyle scene",
    description: "The product in use, in a real place your customer recognises.",
    surface: "image",
    category: "lifestyle",
    models: IMAGE_MODELS,
    settings: { resolution: "2k" },
    template: [
      "Lifestyle product photograph of {{product.name}}{{product.categoryPhrase}} in {{scene}}.",
      "{{product.appearance}}",
      "{{brand.styleLine}}",
      "Natural, believable environment, the product is the hero and clearly recognisable from the reference photo, shallow depth of field, editorial photography, no text.",
      "{{brand.audienceLine}}",
      "{{channel.guidance}}",
      "{{brand.avoid}}",
    ].join("\n"),
    productRole: "reference",
    scenePlaceholder: "Where is it? — a sunlit kitchen counter at breakfast, a trail at golden hour…",
    sceneExamples: [
      "a bright scandinavian kitchen at breakfast, morning light",
      "a rooftop terrace at golden hour, city behind",
      "a rainy café window seat, warm interior light",
    ],
    channels: ["instagram_feed", "instagram_story", "pinterest", "shopify_hero", "email_banner"],
  },
  {
    id: "flat-lay",
    label: "Flat lay",
    description: "Top-down arrangement with a few props that tell the product's story.",
    surface: "image",
    category: "studio",
    models: IMAGE_MODELS,
    settings: { resolution: "2k" },
    template: [
      "Top-down flat lay photograph featuring {{product.name}}{{product.categoryPhrase}}, styled with {{scene}}.",
      "{{product.appearance}}",
      "{{brand.styleLine}}",
      "{{brand.paletteLine}}",
      "Clean composition on a single surface, balanced negative space, soft directional daylight, crisp detail, no text.",
      "{{brand.avoid}}",
    ].join("\n"),
    productRole: "reference",
    scenePlaceholder: "Props and surface — linen cloth, dried flowers, a ceramic cup…",
    sceneExamples: ["linen cloth, dried eucalyptus and a ceramic cup", "raw oak board, sea salt and lemon halves"],
    channels: ["instagram_feed", "pinterest", "email_banner"],
  },
  {
    id: "hero-banner",
    label: "Hero banner",
    description: "Wide storefront banner with room for a headline.",
    surface: "image",
    category: "studio",
    models: IMAGE_MODELS,
    settings: { resolution: "2k" },
    template: [
      "Wide hero banner photograph of {{product.name}}{{product.categoryPhrase}}, {{scene}}.",
      "{{product.appearance}}",
      "{{brand.styleLine}}",
      "{{brand.paletteLine}}",
      "Product placed on one third of the frame, calm uncluttered negative space on the other side for a headline, premium commercial lighting, no text in the image.",
      "{{brand.avoid}}",
    ].join("\n"),
    productRole: "reference",
    scenePlaceholder: "Backdrop and mood — on a marble ledge with soft shadows, floating on a gradient…",
    sceneExamples: ["on a marble ledge with long soft shadows", "on a smooth color gradient backdrop, studio rim light"],
    channels: ["shopify_hero", "email_banner"],
  },
  {
    id: "seasonal-campaign",
    label: "Seasonal campaign",
    description: "The product dressed for a moment — Christmas, summer sale, back to school.",
    surface: "image",
    category: "social",
    models: IMAGE_MODELS,
    settings: { resolution: "2k" },
    template: [
      "Seasonal campaign photograph of {{product.name}}{{product.categoryPhrase}} for {{scene}}.",
      "{{product.appearance}}",
      "{{brand.styleLine}}",
      "{{brand.paletteLine}}",
      "Festive but tasteful set dressing that never hides the product, cohesive color story, commercial photography quality, no text.",
      "{{channel.guidance}}",
      "{{brand.avoid}}",
    ].join("\n"),
    productRole: "reference",
    scenePlaceholder: "The occasion — Christmas gifting, summer beach season, Valentine's…",
    sceneExamples: ["Christmas gifting, warm fairy lights and fir branches", "summer beach season, bright sun and sand"],
    channels: ["instagram_feed", "instagram_story", "email_banner", "pinterest"],
  },
  {
    id: "on-model",
    label: "On model",
    description: "Apparel and accessories worn by a person, editorial style.",
    surface: "image",
    category: "lifestyle",
    models: IMAGE_MODELS,
    settings: { resolution: "2k" },
    template: [
      "Editorial fashion photograph of a person wearing {{product.name}}{{product.categoryPhrase}}, {{scene}}.",
      "{{product.appearance}}",
      "The garment matches the reference photo exactly in color, cut and detail.",
      "{{brand.styleLine}}",
      "{{brand.audienceLine}}",
      "Natural pose, confident expression, realistic skin and fabric, professional lighting, no text.",
      "{{channel.guidance}}",
      "{{brand.avoid}}",
    ].join("\n"),
    productRole: "reference",
    scenePlaceholder: "Who and where — a woman in her thirties on a city street at dusk…",
    sceneExamples: ["a man in his thirties walking a city street at dusk", "a woman on a windy coastal path, overcast light"],
    channels: ["instagram_feed", "instagram_story", "pinterest", "shopify_hero"],
  },
  {
    id: "macro-detail",
    label: "Macro detail",
    description: "Extreme close-up on texture, stitching, finish.",
    surface: "image",
    category: "studio",
    models: IMAGE_MODELS,
    settings: { resolution: "2k" },
    template: [
      "Macro product photograph of {{product.name}}{{product.categoryPhrase}}, extreme close-up on {{scene}}.",
      "{{product.appearance}}",
      "Razor-sharp texture, shallow depth of field, controlled studio light with a soft highlight, premium material feel, no text.",
      "{{brand.avoid}}",
    ].join("\n"),
    productRole: "reference",
    scenePlaceholder: "Which detail — the stitching, the brushed metal cap, the woven strap…",
    sceneExamples: ["the stitching and leather grain", "the brushed metal cap and embossed logo"],
    channels: ["instagram_feed", "shopify_hero"],
  },
  {
    id: "product-spin",
    label: "Product reveal",
    description: "A slow orbit or push-in on the product from your photo.",
    surface: "video",
    category: "video",
    models: VIDEO_MODELS,
    settings: { resolution: "1080p", generateAudio: false, sound: false },
    template: [
      "Slow cinematic camera orbit around {{product.name}}{{product.categoryPhrase}}, starting exactly from the reference frame.",
      "{{scene}}",
      "The product stays perfectly still and unchanged; only the camera moves. Soft studio lighting with gentle highlights travelling across the surface, clean background, no text.",
      "{{brand.avoid}}",
    ].join("\n"),
    productRole: "start",
    scenePlaceholder: "Camera and light — a 180° orbit with a rim light, a slow push-in…",
    sceneExamples: ["a slow 180° orbit with a travelling rim light", "a slow push-in ending on the label"],
    channels: ["instagram_feed", "instagram_story", "shopify_hero", "tiktok"],
  },
  {
    id: "lifestyle-broll",
    label: "Lifestyle b-roll",
    description: "Short atmospheric clip of the product in a scene, for ads and Reels.",
    surface: "video",
    category: "video",
    models: VIDEO_MODELS,
    settings: { resolution: "1080p", generateAudio: true },
    template: [
      "Cinematic lifestyle video of {{product.name}}{{product.categoryPhrase}} in {{scene}}.",
      "{{product.appearance}}",
      "{{brand.styleLine}}",
      "Starts from the reference frame, subtle handheld motion, natural light, the product is always recognisable and in focus, no text or captions.",
      "{{channel.guidance}}",
      "{{brand.avoid}}",
    ].join("\n"),
    productRole: "start",
    scenePlaceholder: "The moment — being unpacked on a kitchen table, picked up on a morning run…",
    sceneExamples: ["being picked up from a sunlit kitchen table", "carried on a morning run through a park"],
    channels: ["instagram_story", "tiktok", "youtube_ad", "shopify_hero"],
  },
  {
    id: "ugc-style",
    label: "UGC-style clip",
    description: "Looks like a customer filmed it on a phone — the ad format that performs.",
    surface: "video",
    category: "social",
    models: VIDEO_MODELS,
    settings: { resolution: "720p", generateAudio: true },
    template: [
      "Authentic user-generated style phone video of a person showing {{product.name}}{{product.categoryPhrase}}, {{scene}}.",
      "{{product.appearance}}",
      "{{brand.audienceLine}}",
      "Handheld smartphone look, natural indoor light, casual and genuine energy, the product held up to camera and clearly visible, no on-screen text.",
      "{{channel.guidance}}",
      "{{brand.avoid}}",
    ].join("\n"),
    productRole: "reference",
    scenePlaceholder: "The setting — unboxing on a bed, a quick review at a desk…",
    sceneExamples: ["unboxing it on a bed and holding it up to camera", "a quick excited review at a desk"],
    channels: ["tiktok", "instagram_story"],
  },
  {
    id: "unboxing",
    label: "Unboxing",
    description: "Hands opening the packaging and revealing the product.",
    surface: "video",
    category: "video",
    models: VIDEO_MODELS,
    settings: { resolution: "1080p", generateAudio: true },
    template: [
      "Close-up unboxing video: hands open the packaging and reveal {{product.name}}{{product.categoryPhrase}}, {{scene}}.",
      "{{product.appearance}}",
      "{{brand.styleLine}}",
      "Satisfying slow reveal, soft window light, tactile detail, the product matches the reference photo, no text.",
      "{{brand.avoid}}",
    ].join("\n"),
    productRole: "reference",
    scenePlaceholder: "Surface and mood — on a wooden desk with morning light…",
    sceneExamples: ["on a wooden desk with soft morning light", "on a white marble counter, overhead view"],
    channels: ["tiktok", "instagram_story", "youtube_ad"],
  },
];

export function getPreset(id: string): Preset {
  const preset = PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`Unknown preset: ${id}`);
  return preset;
}

export function findPreset(id: string | null | undefined): Preset | null {
  return (id && PRESETS.find((entry) => entry.id === id)) || null;
}

export function presetsFor(surface: Surface): Preset[] {
  return PRESETS.filter((preset) => preset.surface === surface);
}
