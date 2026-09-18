/* One source of truth for the site's identity and its canonical origin.
   Server-only by intent: VERCEL_PROJECT_PRODUCTION_URL is not exposed to the
   browser, so importing SITE_URL into a client component would resolve
   differently on each side. Keep this module out of "use client" files. */

function resolveOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveOrigin();

export const SITE_NAME = "Vitrina";
export const SITE_DESCRIPTOR = "AI product visuals for e-commerce";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_DESCRIPTOR}`;

export const SITE_DESCRIPTION =
  "Product photos and clips for every channel, from the photo you already have. Presets for pack shots, lifestyle scenes, reveals and UGC clips; the brand kit writes the prompt, the channel fixes the ratio.";

/** Near-black studio ground; also the installed-app and browser-chrome color. */
export const STUDIO_BG = "#0a0a0b";

/* The card built by scripts/build-brand-assets.mjs. It lives in public/ rather
   than as an app/opengraph-image file on purpose: the file convention outranks
   an explicit declaration in its own segment, so the two would disagree about
   the alt text — the root would take it from an opengraph-image.alt.txt while
   every route that overrides `openGraph` took it from here. One asset, one
   declaration, one alt. */
export const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "The Vitrina mark on a near-black field, above the Vitrina wordmark, the words AI product visuals for e-commerce, and a line describing presets and channels for product photos and clips.",
};

/* Next replaces the whole `openGraph` (and `twitter`) object when a route
   defines one, so a route that only wants its own url would silently drop
   og:type, og:site_name, og:locale and the card. Overrides go through here. */
export function openGraphFor({
  path,
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
}: {
  path: string;
  title?: string;
  description?: string;
}) {
  return {
    type: "website" as const,
    siteName: SITE_NAME,
    locale: "en_US",
    url: path,
    title,
    description,
    images: [OG_IMAGE],
  };
}

export function twitterFor({
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
}: { title?: string; description?: string } = {}) {
  return {
    card: "summary_large_image" as const,
    title,
    description,
    images: [OG_IMAGE],
  };
}
