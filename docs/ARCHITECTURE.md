# Architecture

Vitrina wraps a catalog-driven generation studio with the objects an
e-commerce team actually works with — products, a brand kit, presets,
channels, campaigns — and the plumbing needed to sell it: accounts,
workspaces, credits, billing.

```
browser ──── server actions ────► platform API (Higgsfield)
   │                │                    ▲
   │                ├── credits ledger   │ Authorization: Key id:secret
   │                ├── run log          │ (operator key or workspace BYOK)
   │                └── libsql DB ───────┘
   └──── /api/upload | /api/blob ───► local disk | Vercel Blob
```

## Layers

| Layer | Path | Depends on |
| --- | --- | --- |
| Domain (vertical as data) | `src/domain` | catalog types only |
| Generation engine | `src/generation` | domain (pricing), server (runs, credits, session) |
| Server services & actions | `src/server` | db, domain |
| Studio surface | `src/studio` | generation, domain, server actions |
| App pages | `src/app`, `src/ui` | everything above |

Dependencies point downward. The domain never imports from the server or
the UI, so its tests run in plain Node and it can be swapped for another
industry without touching the rest (see `VERTICAL.md`).

## One generation, end to end

1. The composer holds a **job**: product, preset, channel (`src/studio/stores/job.ts`).
   Picking a preset selects the model it prefers; a preset or channel writes
   the model's settings (`resolveSettings`); the product's photos are attached
   under the role the preset wants.
2. On Generate, the studio assembles the plane (model, media, settings) and
   compiles the prompt: `compilePrompt(preset.template, { product, brand, channel, scene })`.
   With no preset, the free template folds the product's appearance and the
   brand's style and avoid-list around the visitor's words.
3. `submitGeneration` (server action) checks the session, resolves the key
   (workspace BYOK, else operator `PLATFORM_API_KEY`), prices the run
   (`creditsFor`), **reserves credits atomically**, submits to the platform,
   and inserts one running row per expected result. A submit failure refunds.
4. The browser polls `getGenerationStatuses` every 4 s for every request in
   flight (one round trip). The **server** settles terminal answers: rows are
   re-cut to one per delivered URL, failures are recorded and refunded once
   (the ledger's `(requestId, reason)` uniqueness guarantees it). A request
   nobody polls for ten minutes is abandoned and refunded by the same path.
5. Tiles bloom in the grid; the viewer shows the scene, the final prompt,
   product / preset / channel, and Approve / Reject. Approved runs are what a
   campaign export packs, filed `brand/product/channel/preset-NN.ext`.

## Data model

`user`, `session`, `account`, `verification` — better-auth.
`workspace` (plan, cached credit balance, Stripe ids, sealed BYOK key) ·
`membership` · `invite` (tokened links, spent once, seats per plan) ·
`brand_kit` · `product` · `product_asset` · `upload` · `campaign` · `run` ·
`credit_ledger` · `stripe_event`.

A user can belong to several workspaces; the `vt_workspace` cookie names the
one on screen and `workspaceForUser` falls back to the first membership.

`workspace.credit_balance` is a cache of `sum(credit_ledger.delta)` and is
only written inside `src/server/credits.ts`, in the same statement or batch
as the ledger row.

## Keys and money

- **Operator mode**: the installation's `PLATFORM_API_KEY` pays the platform;
  customers pay in credits (Stripe subscriptions grant a monthly allowance).
- **BYOK**: a workspace owner pastes their own platform key; it is sealed with
  AES-256-GCM under `APP_SECRET` and runs cost zero credits.
- Prices and credit grants live in `src/domain/plans.ts`; Stripe price ids in
  the environment. The webhook (`/api/billing/webhook`) is idempotent by
  event id.

## Storage

Uploads are public URLs the platform fetches. `local` writes under
`DATA_DIR/uploads/<workspace>/<uuid>-<name>` and serves via `/api/files`
(unauthenticated, unguessable path). `blob` issues scoped Vercel Blob client
tokens to signed-in members only.

## Testing

- `vitest`: domain (prompt compiler, settings resolution against the real
  catalog, pricing, export paths), credits ledger races and idempotency,
  Stripe event application, sealing.
- Playwright: sign-up → brand kit → product photo → studio job rail →
  generate → review → refund on failure → campaign plan → export zip, all
  against `scripts/mock-platform.mjs`.
