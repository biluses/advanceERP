/** The vertical, as data. Swapping the industry this product serves means
    replacing the presets and channels and the words below — the studio, the
    billing and the generation engine do not change. See docs/VERTICAL.md. */
export const VERTICAL = {
  id: "ecommerce",
  /** What the product calls itself. */
  name: "Vitrina",
  descriptor: "AI product visuals for e-commerce brands",
  /** What a "product" is called in this industry's UI. */
  subjectNoun: "product",
  subjectNounPlural: "products",
} as const;

export * from "./brand";
export * from "./channels";
export * from "./export";
export * from "./plans";
export * from "./presets";
export * from "./pricing";
export * from "./prompt";
