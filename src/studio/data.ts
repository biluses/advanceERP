import type { MediaRole, ModelEntry, Surface } from "@/generation/catalog";

export const SURFACES: readonly Surface[] = ["image", "video"];

export const SURFACE_LABELS: Record<Surface, string> = {
  image: "Image",
  video: "Video",
};

/** What the gallery is scoped to. "assets" is every run, both surfaces;
    "favorites" is every run the visitor kept, both surfaces. */
export type GalleryView = Surface | "assets" | "favorites";

/** Scopes that span both surfaces, so switching to them leaves the model alone. */
export const CROSS_VIEWS = new Set<GalleryView>(["assets", "favorites"]);

export const VIEWS: readonly GalleryView[] = ["image", "video", "assets", "favorites"];

export const VIEW_LABELS: Record<GalleryView, string> = {
  ...SURFACE_LABELS,
  assets: "Assets",
  favorites: "Favorites",
};

export const PROMPT_PLACEHOLDERS: Record<Surface, string> = {
  image: "Describe the shot — or pick a product and a preset above and just say where it is…",
  video: "Describe the clip — or pick a product and a preset above and just say the moment…",
};

/* The pool the empty state draws from. Each line is a whole prompt — subject,
   light, lens or camera move — so a click loads something worth pressing
   Generate on rather than a fragment to finish. */
export const SAMPLES: Record<Surface, string[]> = {
  image: [
    "Matte ceramic espresso cup on wet slate, rim light, steam caught mid-curl, pure white seamless background",
    "Trail running shoe mid-stride on a gravel path at golden hour, dust kicking up, shallow depth of field",
    "Skincare bottle on a marble ledge with soft morning shadows, eucalyptus sprig, editorial still life",
    "Linen shirt on a wooden hanger in a sunlit bedroom, breeze in the curtains, natural warm tones",
    "Cold brew can sweating on a picnic table, summer light, cut lemons and ice, top-down flat lay",
    "Leather weekender bag on a train platform at dusk, long lens compression, muted palette",
    "Wireless headphones floating over a smooth gradient backdrop, studio rim light, premium tech look",
    "Handmade candle in a rainy café window seat, warm interior light, cozy editorial mood",
    "Kids' wooden toy set on a playroom rug, soft daylight, bright cheerful colors, no text",
    "Dog collar on a golden retriever in a park, morning backlight, joyful natural moment",
    "Gold pendant necklace on a model's collarbone, macro detail, soft skin, luxury lighting",
    "Sunglasses on a beach towel with sand and sea foam, harsh noon sun, summer campaign",
  ],
  video: [
    "Slow cinematic orbit around a ceramic mug on a marble counter, rim light travelling across the glaze",
    "Handheld phone-style clip of someone unboxing sneakers on a bed, morning light, excited energy",
    "Slow push-in on a skincare bottle as water droplets bead on the glass, soft studio light",
    "Trail runner tying a shoe at dawn, close on the laces, dust and golden backlight",
    "Top-down hands pouring cold brew over ice, condensation, bright summer kitchen",
    "Leather bag lifted off a hotel bed and carried to the window, warm afternoon light",
    "Headphones rotating on a gradient backdrop, reflections sliding across the ear cups",
    "Candle flame flickering in a rainy window seat, shallow focus, cozy evening mood",
    "Kids building with wooden blocks on a rug, playful handheld motion, soft daylight",
    "Golden retriever shaking off water in a park, collar catching the light, slow motion",
    "Model turning toward camera wearing a linen shirt on a windy coastal path",
    "Sunglasses picked up from a towel and put on, beach behind, quick UGC-style cut",
  ],
};

/** A few of the pool in a fresh order, so two visits are not handed the same
    shelf. Called on the client only — picking during render would give the
    server a different set than the hydrating client. */
export function pickSamples(surface: Surface, count = 3): string[] {
  const pool = [...SAMPLES[surface]];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count);
}

const SETTING_LABELS: Record<string, string> = {
  aspectRatio: "Aspect ratio",
  resolution: "Resolution",
  outputFormat: "Format",
  duration: "Duration",
  generateAudio: "Generate audio",
  batchSize: "Batch size",
  enhancePrompt: "Enhance prompt",
  thinking: "Thinking",
  numImages: "Images",
  sound: "Sound",
  cfgScale: "CFG",
  multiShots: "Multi-shot",
  keepOriginalSound: "Keep original sound",
  characterOrientation: "Orientation",
};

/* A pill carries one word; "Generate audio" is a panel label, not a control on
   a crowded rail. Only keys that read badly at pill length appear here. */
const SETTING_PILL_LABELS: Record<string, string> = {
  generateAudio: "Audio",
};

export function settingLabel(key: string): string {
  return (
    SETTING_LABELS[key] ??
    key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase())
  );
}

export function settingPillLabel(key: string): string {
  return SETTING_PILL_LABELS[key] ?? settingLabel(key);
}

/* Values arrive in the platform's own casing. Only the units conventionally
   set in caps are lifted; "720p" and "16:9" are already how they are written. */
export function settingValueLabel(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (typeof value === "number") return key === "duration" ? `${value}s` : String(value);
  const text = String(value);
  if (text === "auto") return "Auto";
  if (/^\d+k$/.test(text)) return text.toUpperCase();
  if (key === "outputFormat") return text.toUpperCase();
  return text;
}

export const ROLE_LABELS: Record<MediaRole, string> = {
  start: "Start frame",
  end: "End frame",
  reference: "Reference",
  video: "Video",
  audio: "Audio",
};

/* Slate tags for the attachment tiles, where the full label will not fit. */
export const ROLE_TAGS: Record<MediaRole, string> = {
  start: "START",
  end: "END",
  reference: "REF",
  video: "VIDEO",
  audio: "AUDIO",
};

/* What a role can hold, in the coarser unit the asset library sorts by. The
   accept string above is the file dialog's business; this is the picker's. */
export type AssetKind = "image" | "video" | "audio";

export const ROLE_KINDS: Record<MediaRole, AssetKind> = {
  start: "image",
  end: "image",
  reference: "image",
  video: "video",
  audio: "audio",
};

/* The picker's confirm button names what it attaches — "Add 2 references",
   "Add start frame" — so each role carries its plural rather than taking an s. */
const ROLE_PLURALS: Record<MediaRole, string> = {
  start: "start frames",
  end: "end frames",
  reference: "references",
  video: "clips",
  audio: "audio tracks",
};

export function roleNoun(role: MediaRole, count: number): string {
  return count === 1 ? ROLE_LABELS[role].toLowerCase() : ROLE_PLURALS[role];
}

/* Mirrors the allow-list in src/app/api/blob/route.ts. */
export const ROLE_ACCEPT: Record<MediaRole, string> = {
  start: "image/jpeg,image/png,image/webp,image/gif",
  end: "image/jpeg,image/png,image/webp,image/gif",
  reference: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4",
  audio: "audio/wav,audio/x-wav",
};

export function rolesOf(model: ModelEntry): MediaRole[] {
  return Object.keys(model.roles) as MediaRole[];
}

export function defaultRole(model: ModelEntry): MediaRole {
  if (model.surface === "image" && model.roles.reference) return "reference";
  if (model.roles.start) return "start";
  return rolesOf(model)[0] ?? "reference";
}

const RATIO = /^(\d+):(\d+)$/;

/** The mini rectangle a ratio value draws, scaled into a 14px optical box —
    null when the value is not a ratio ("auto"), so the caller can reserve the
    slot or draw a plain frame instead. */
export function ratioBox(value: string): { width: number; height: number } | null {
  const match = RATIO.exec(value);
  if (!match) return null;
  const w = Number(match[1]);
  const h = Number(match[2]);
  const scale = 14 / Math.max(w, h);
  return { width: Math.max(5, Math.round(w * scale)), height: Math.max(5, Math.round(h * scale)) };
}

export function ratioToCss(value: unknown, fallback: string): string {
  const match = RATIO.exec(String(value ?? ""));
  return match ? `${match[1]} / ${match[2]}` : fallback;
}

/* Two roles share one word — a start and an end frame are both frames — so the
   phrases dedupe before they are listed. */
const ROLE_PHRASES: Record<MediaRole, string> = {
  start: "frames",
  end: "frames",
  reference: "references",
  video: "clips",
  audio: "audio",
};

function joinPhrases(parts: string[]): string {
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}`;
}

/** The line under a model's name in the picker, derived from the entry itself:
    what it makes, what it takes, where its allow-lists top out. The catalog
    stays the only place a model's truth is written down. */
export function describeModel(model: ModelEntry): string {
  const noun = model.surface === "image" ? "Images" : "Video";
  const inputs = [...new Set(rolesOf(model).map((role) => ROLE_PHRASES[role]))];
  const source = inputs.length
    ? `${noun} from a prompt, ${joinPhrases(inputs)}`
    : `${noun} from a prompt`;

  const limits: string[] = [];
  const resolution = model.settings.resolution;
  /* The catalog declares resolutions in ascending order, so the ceiling is the
     last value it lists. */
  if (resolution?.type === "enum" && resolution.values.length > 0) {
    const top = resolution.values[resolution.values.length - 1]!;
    limits.push(`to ${settingValueLabel("resolution", top)}`);
  }
  const duration = model.settings.duration;
  if (duration?.type === "range") limits.push(`${duration.min}–${duration.max}s`);

  return limits.length ? `${source} · ${limits.join(", ")}` : source;
}

/* Keys that already mean "results per request". The composer shows one batch
   control whatever the model is: where the catalog declares one of these it
   writes the setting and the platform answers with that many media; every
   other model is submitted once per result. A key named here is claimed by the
   batch control and never also drawn as a settings pill, so the studio's count
   and the model's own can never disagree. */
export const COUNT_KEYS = ["numImages", "batchSize"];

export type CountSetting = {
  key: string;
  /** How the value is written back: an enum stores the count as the string the
      catalog declared, a range stores it as a number. */
  kind: "enum" | "range";
  /** Every count the model allows, ascending. The control walks this list, so a
      model offering only 1 or 4 can never be left on an illegal 2. */
  counts: number[];
};

export function countSetting(model: ModelEntry): CountSetting | null {
  for (const key of COUNT_KEYS) {
    const field = model.settings[key];
    if (field?.type === "range") {
      const counts: number[] = [];
      for (let n = field.min; n <= field.max; n++) counts.push(n);
      return { key, kind: "range", counts };
    }
    if (field?.type === "enum") {
      const counts = field.values.map(Number).filter(Number.isInteger).sort((a, b) => a - b);
      if (counts.length > 0) return { key, kind: "enum", counts };
    }
  }
  return null;
}

/* The two or three facts that summarise a run at a glance, in the same casing
   the settings panel and the viewer write them — the grid draws these as
   separate chips by splitting on the separator. */
export function metaOf(model: ModelEntry, values: Record<string, unknown>): string {
  const label = (key: string) =>
    values[key] === undefined ? null : settingValueLabel(key, values[key]);
  const parts =
    model.surface === "image"
      ? [label("resolution"), label("outputFormat")]
      : [label("resolution"), label("duration"), values.generateAudio === true ? "Audio" : null];
  return parts.filter(Boolean).join(" · ");
}

export function durationBadge(values: Record<string, unknown>): string | undefined {
  if (typeof values.duration !== "number") return undefined;
  return formatClock(values.duration);
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.max(0, Math.round(totalSeconds - m * 60));
  return `${m}:${String(s).padStart(2, "0")}`;
}
