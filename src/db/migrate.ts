import { migrate } from "drizzle-orm/libsql/migrator";

import { db } from "./client";

/** Applies every migration in drizzle/ that the database has not seen. Safe to
    run on every boot: an up-to-date database is a no-op. */
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: "./drizzle" });
}
