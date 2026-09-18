import type { ModelEntry, Surface } from "@/generation/catalog/types";

/** Where a finished asset is going to be published. A channel is the one thing
    an e-commerce team never negotiates: Instagram wants 4:5 or 1:1, a Story is
    9:16, Amazon's main image is square on white. The channel decides ratio and
    duration; the preset decides what is in the frame. */
export type ChannelId =
  | "instagram_feed"
  | "instagram_story"
  | "tiktok"
  | "amazon_listing"
  | "shopify_hero"
  | "youtube_ad"
  | "pinterest"
  | "email_banner";

export type Channel = {
  id: ChannelId;
  label: string;
  network: string;
  surfaces: readonly Surface[];
  /** Preferred aspect ratio first, then the closest fallbacks in order. The
      resolver walks the list until the model declares one of them. */
  aspects: readonly string[];
  video?: { min: number; max: number; preferred: number };
  /** Composition guidance appended to the prompt — text-safe areas, the white
      background a marketplace mandates, the vertical framing of a Story. */
  guidance: string;
  /** Short tag used in exported file names. */
  tag: string;
};

export const CHANNELS: readonly Channel[] = [
  {
    id: "instagram_feed",
    label: "Instagram feed",
    network: "Instagram",
    surfaces: ["image", "video"],
    aspects: ["4:5", "1:1", "3:4", "4:3"],
    video: { min: 3, max: 60, preferred: 8 },
    guidance: "Composed for a mobile feed: the product large and centered, clean edges, no text baked into the image.",
    tag: "ig-feed",
  },
  {
    id: "instagram_story",
    label: "Instagram Story / Reel",
    network: "Instagram",
    surfaces: ["image", "video"],
    aspects: ["9:16", "3:4", "1:1"],
    video: { min: 3, max: 15, preferred: 8 },
    guidance: "Vertical full-screen framing; keep the top 15% and bottom 20% free of key detail so captions and stickers do not cover the product.",
    tag: "ig-story",
  },
  {
    id: "tiktok",
    label: "TikTok",
    network: "TikTok",
    surfaces: ["video"],
    aspects: ["9:16", "3:4", "1:1"],
    video: { min: 5, max: 15, preferred: 10 },
    guidance: "Vertical, energetic and native-looking; the first second must already show the product; leave the right edge free for the interface icons.",
    tag: "tiktok",
  },
  {
    id: "amazon_listing",
    label: "Amazon main image",
    network: "Amazon",
    surfaces: ["image"],
    aspects: ["1:1", "4:3", "3:4"],
    guidance: "Marketplace main-image rules: pure white seamless background, the product filling about 85% of the frame, no props, no text, no watermark, realistic colors.",
    tag: "amazon",
  },
  {
    id: "shopify_hero",
    label: "Storefront hero",
    network: "Shopify / web",
    surfaces: ["image", "video"],
    aspects: ["16:9", "21:9", "4:3"],
    video: { min: 4, max: 12, preferred: 6 },
    guidance: "Wide banner composition with the product on one third of the frame and calm negative space on the other side for a headline and a button.",
    tag: "hero",
  },
  {
    id: "youtube_ad",
    label: "YouTube ad",
    network: "YouTube",
    surfaces: ["video"],
    aspects: ["16:9", "4:3"],
    video: { min: 6, max: 15, preferred: 10 },
    guidance: "Landscape, cinematic pacing with a clear product reveal in the first three seconds and a steady closing frame for an end card.",
    tag: "youtube",
  },
  {
    id: "pinterest",
    label: "Pinterest pin",
    network: "Pinterest",
    surfaces: ["image"],
    aspects: ["2:3", "3:4", "9:16", "1:1"],
    guidance: "Tall editorial pin with soft natural light and an aspirational, magazine-like styling.",
    tag: "pinterest",
  },
  {
    id: "email_banner",
    label: "Email banner",
    network: "Email",
    surfaces: ["image"],
    aspects: ["16:9", "21:9", "4:3"],
    guidance: "Wide, bright and legible at small sizes; product on one side, uncluttered space for a headline on the other.",
    tag: "email",
  },
];

export function getChannel(id: string): Channel {
  const channel = CHANNELS.find((entry) => entry.id === id);
  if (!channel) throw new Error(`Unknown channel: ${id}`);
  return channel;
}

export function isChannelId(id: string): id is ChannelId {
  return CHANNELS.some((entry) => entry.id === id);
}

export function channelsFor(surface: Surface): Channel[] {
  return CHANNELS.filter((channel) => channel.surfaces.includes(surface));
}

/** The ratio this model can actually make for this channel, or null when the
    model declares no aspect setting at all (the platform decides). */
export function resolveAspect(channel: Channel, model: ModelEntry): string | null {
  const field = model.settings.aspectRatio;
  if (!field || field.type !== "enum") return null;
  for (const candidate of channel.aspects) {
    if (field.values.includes(candidate)) return candidate;
  }
  return field.default;
}

/** The channel's preferred length, clamped into what the model allows. */
export function resolveDuration(channel: Channel, model: ModelEntry): number | null {
  const field = model.settings.duration;
  if (!field || field.type !== "range" || !channel.video) return null;
  const wanted = Math.min(channel.video.max, Math.max(channel.video.min, channel.video.preferred));
  return Math.min(field.max, Math.max(field.min, wanted));
}
