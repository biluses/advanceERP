import type { ModelEntry } from "@/generation/catalog/types";

/** Credits are the unit customers buy. One credit is roughly one standard
    image; video is priced per second and by resolution, so a 10s 1080p clip
    costs what a small batch of images does. Integers only — a ledger of
    fractions is a ledger nobody can audit. */

const IMAGE_BASE = 1;
const IMAGE_RESOLUTION: Record<string, number> = { "1k": 1, "2k": 2, "4k": 4, "720p": 1, "1080p": 2 };

/** Credits per second of video, by resolution. */
const VIDEO_PER_SECOND: Record<string, number> = { "480p": 0.5, "720p": 1, "1080p": 2, "4k": 4 };
const VIDEO_DEFAULT_SECONDS = 5;
const VIDEO_MIN = 4;

/** Premium tiers cost more on the platform and therefore here. Matched by
    model id fragment so a new "pro" variant is priced without a code change. */
const TIER_MULTIPLIER: ReadonlyArray<[RegExp, number]> = [
  [/-4k$/, 2],
  [/-pro$/, 1.5],
  [/cinema$/, 1.5],
  [/-(fast|mini|turbo)$/, 0.75],
];

export function creditsFor(model: ModelEntry, settings: Record<string, unknown>): number {
  const tier = TIER_MULTIPLIER.find(([pattern]) => pattern.test(model.id))?.[1] ?? 1;
  if (model.surface === "image") {
    const resolution = String(settings.resolution ?? "");
    const perImage = IMAGE_BASE * (IMAGE_RESOLUTION[resolution] ?? 1) * tier;
    const count = countOf(settings);
    return Math.max(1, Math.ceil(perImage * count));
  }
  const seconds = typeof settings.duration === "number" ? settings.duration : VIDEO_DEFAULT_SECONDS;
  const resolution = String(settings.resolution ?? "720p");
  const rate = VIDEO_PER_SECOND[resolution] ?? 1;
  return Math.max(VIDEO_MIN, Math.ceil(seconds * rate * tier));
}

function countOf(settings: Record<string, unknown>): number {
  for (const key of ["batchSize", "numImages"]) {
    const value = Number(settings[key]);
    if (Number.isInteger(value) && value > 0) return value;
  }
  return 1;
}
