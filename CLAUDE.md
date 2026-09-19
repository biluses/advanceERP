# Vitrina — working notes for agents

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · plain CSS ·
Zustand · Drizzle + libsql · better-auth · Stripe · vitest · Playwright · pnpm.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server on :3000 (migrations run on boot) |
| `pnpm mock:platform` | Stand-in generation API on :4010 — point `HF_API_BASE_URL` at it |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | ESLint, `tsc --noEmit`, vitest |
| `pnpm build` | Production build (standalone output) |
| `pnpm test:e2e` | Playwright against a fresh prod build + mock platform |
| `pnpm db:generate` | New migration after editing `src/db/schema.ts` |
| `pnpm credits <email> <n>` | Grant credits without Stripe |
| `pnpm wipe:local [--deps] [--keep-uploads] [--yes] [--dry-run]` | Wipe local DB, uploads, build and test artifacts, then re-migrate (skill `wipe-local`) |

## Skills

- `reset-total` — close the session before a compact or restart: state file in
  `docs/sessions/`, durable rules into this file, resume prompt.
- `wipe-local` — destructive local reset of data, build and artifacts.

Set `PLAYWRIGHT_CHROMIUM_PATH` to reuse a Chromium already on disk.

## Deploy

- Production is the Vercel project `vitrina` (team `biluses-projects`), built
  from `master` with `vercel-build` (migrate, then `next build`). Standalone
  output is off on Vercel. The Vercel connector can redeploy and read logs
  but cannot set environment variables or create stores: those are Sergio's.
- Changes reach `master` through a PR from the working branch; never push
  to `master` directly.

## Where things live

- `src/domain/` — the vertical as data: channels, presets, prompt compiler,
  pricing, plans. Pure, unit-tested, no I/O. Change the industry here.
- `src/generation/` — the engine inherited from open-higgsfield: catalog,
  platform client, request mapper, poll loop, server actions (`actions.ts`).
- `src/server/` — DB-backed services and `actions/*` server actions. Every
  action starts with `requireViewer()`; pages start with `viewerOrRedirect()`.
- `src/studio/` — the studio surface (composer, gallery, viewer, job rail).
  `use-generation.ts` is the run lifecycle shared with the campaign page.
- `src/ui/` — app pages' client components and `app.css`.
- `src/app/` — routes. `/` marketing, `/login`, `/register`, `/app/*` behind
  the session, `/api/*` auth, uploads, files, billing webhook.

## Rules of the house

- The catalog is the source of truth for what a model takes; presets and
  channels only choose among what it declares. `resolveSettings` must always
  produce something `parseSettings` accepts (there is a test for it).
- Credits are integers, reserved before the platform is asked, refunded once
  per request. Never touch `credit_balance` outside `src/server/credits.ts`.
- Server actions in `"use server"` files export async functions only; put
  helpers in a plain module (`src/server/validation.ts` is the pattern).
- CSS classes are prefixed `vt-`; tokens live on `.vt` in `studio.css`.
- Keep the design principles from the original README: accent is state, not
  decoration; every control ships all its states; nothing loops decoratively.
