import { mkdir } from "node:fs/promises";

import { resolveDatabaseEnv } from "@/db/env";
import { runMigrations } from "@/db/migrate";

/** Brings the database up to the current schema before the first request, so
    a fresh container or a freshly cloned checkout needs no separate step. */
export async function migrateOnBoot(): Promise<void> {
  const { url } = resolveDatabaseEnv();
  if (url.startsWith("file:")) {
    const path = url.slice(5);
    const dir = path.replace(/\/[^/]*$/, "");
    if (dir && dir !== path) await mkdir(dir, { recursive: true });
  }
  await runMigrations();
  console.info("[vitrina] database ready");
}
