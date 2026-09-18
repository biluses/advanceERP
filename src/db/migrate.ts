import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "node:path";

import { db } from "./client";

/** Applies every migration in drizzle/ that the database has not seen. Safe to
    run on every boot: an up-to-date database is a no-op. The folder sits next
    to the server in both a checkout and the standalone build. */
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: resolve(/*turbopackIgnore: true*/ process.cwd(), "drizzle") });
}
