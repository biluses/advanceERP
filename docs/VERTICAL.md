# Changing the industry

The product is a thin, opinionated layer over a general studio. Everything
that makes it "for e-commerce" is data in `src/domain/`:

| File | What it decides |
| --- | --- |
| `presets.ts` | The jobs the industry asks for by name — label, prompt skeleton, preferred models, settings, which media role the subject's photo takes, recommended channels |
| `channels.ts` | Where results go — ratio preferences, video lengths, composition guidance |
| `brand.ts` | What the subject and the brand are made of (schemas, categories) |
| `pricing.ts`, `plans.ts` | What a run costs and what is sold |
| `index.ts` | `VERTICAL` — the product's name and nouns |

To ship, say, a real-estate edition:

1. Replace the presets: "listing hero", "twilight exterior", "virtual staging",
   "walkthrough clip". The template tokens stay the same
   (`{{product.name}}`, `{{product.appearance}}`, `{{brand.styleLine}}`,
   `{{channel.guidance}}`, `{{scene}}` …); rename what "product" means in
   `VERTICAL.subjectNoun` and the schema fields in `brand.ts`.
2. Replace the channels: MLS main photo, Instagram, a YouTube tour.
3. Run `pnpm test` — the preset test proves every preset still resolves to a
   real model and settings the catalog accepts.
4. Reword the landing page (`src/app/page.tsx`) and the sample prompts in
   `src/studio/data.ts`.

Nothing in `src/generation`, `src/server`, `src/studio` or billing needs to
change.
