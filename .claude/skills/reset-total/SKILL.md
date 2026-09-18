---
name: reset-total
description: Reset the local Vitrina environment to a clean slate — local database, uploads, build output and test artifacts (optionally node_modules) — then recreate the database. Use when the dev database is corrupted or full of test junk, migrations diverged, the build cache misbehaves, or you want to reproduce a first-run experience. Never for a deployed environment.
---

# reset-total

Wipes everything local and regenerated, keeps everything authored.

## What it removes

| Path | Why |
| --- | --- |
| `data/` (or `DATA_DIR`) | The libsql database file and local uploads |
| `.next/` | Build output and Turbopack cache |
| `test-results/`, `playwright-report/` | e2e artifacts |
| `node_modules/` | Only with `--deps`; reinstalled from the lockfile |

Kept: `.env`, source, git history, `drizzle/` migrations.

## Steps

1. Confirm the target is local. The script refuses when `DATABASE_URL` is not a
   `file:` URL — a remote (Turso) database is never reset from here. If the
   user seems to be on a deployed environment, stop and say so.
2. Stop running servers first (`pnpm dev`, `pnpm start`, `pnpm mock:platform`):
   an open libsql handle can recreate the file mid-reset.
3. Preview, then run:

   ```bash
   node scripts/reset-total.mjs --dry-run       # lists what would go
   node scripts/reset-total.mjs --yes           # data + build + artifacts
   node scripts/reset-total.mjs --yes --deps    # also node_modules, then pnpm install
   node scripts/reset-total.mjs --yes --keep-uploads   # keep data/uploads, drop the DB
   ```

   Without `--yes` the script asks to type `RESET` when run interactively.
4. The script ends by running the migrations, so the database exists and is
   at the current schema. Start `pnpm dev` and register a fresh account
   (30 trial credits); to skip Stripe, grant credits with
   `pnpm credits <email> <n>`.
5. Report what was removed and that the studio is empty.

## Rules

- This is destructive and unrecoverable for local runs and uploads: when the
  user did not explicitly ask for a reset, ask before running anything but
  `--dry-run`.
- Do not "reset" by deleting individual tables or editing the database by
  hand; the script is the one path so the migration journal stays consistent.
- Do not touch `.env`; a broken environment file is fixed by hand, not by reset.
