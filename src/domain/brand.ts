import { z } from "zod";

/** Everything the studio knows about the brand, written once and folded into
    every prompt. Empty fields are simply left out of the compiled prompt. */
export const brandKitSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(80),
  tagline: z.string().trim().max(160).default(""),
  /** How the brand speaks — "warm and playful", "clinical and premium". */
  tone: z.string().trim().max(160).default(""),
  /** Visual direction — "minimal scandinavian", "bold streetwear". */
  style: z.string().trim().max(240).default(""),
  /** Hex colors, most important first. */
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use #RRGGBB")).max(6).default([]),
  /** Who buys: "urban runners 25–40", "new parents". */
  audience: z.string().trim().max(200).default(""),
  /** Things never to show — competitors, text, clutter. */
  avoid: z.string().trim().max(240).default(""),
  logoUrl: z.string().url().or(z.literal("")).default(""),
});

export type BrandKit = z.infer<typeof brandKitSchema>;
export type BrandKitInput = z.input<typeof brandKitSchema>;

export const EMPTY_BRAND: BrandKit = {
  name: "",
  tagline: "",
  tone: "",
  style: "",
  palette: [],
  audience: "",
  avoid: "",
  logoUrl: "",
};

export const PRODUCT_CATEGORIES = [
  "Apparel",
  "Footwear",
  "Beauty & skincare",
  "Food & beverage",
  "Home & furniture",
  "Electronics",
  "Jewelry & accessories",
  "Sports & outdoor",
  "Toys & kids",
  "Pet",
  "Other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(120),
  category: z.enum(PRODUCT_CATEGORIES).default("Other"),
  description: z.string().trim().max(600).default(""),
  /** Short selling points, one per line in the form. */
  features: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
  /** Materials, colorway, finish — what the model must reproduce faithfully. */
  appearance: z.string().trim().max(300).default(""),
  audience: z.string().trim().max(200).default(""),
  priceLabel: z.string().trim().max(40).default(""),
});

export type ProductInput = z.input<typeof productSchema>;
export type ProductFields = z.infer<typeof productSchema>;

export type ProductAsset = {
  id: string;
  url: string;
  kind: "image" | "video";
  name: string;
};

export type Product = ProductFields & {
  id: string;
  slug: string;
  assets: ProductAsset[];
};

export function slugify(text: string, fallback = "item"): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
  return slug || fallback;
}

/** "one per line" text areas arrive as a string; the schema wants a list. */
export function linesToList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
