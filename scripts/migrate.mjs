import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";

const url = process.env.DATABASE_URL?.trim() || process.env.TURSO_DATABASE_URL?.trim() || "file:./data/vitrina.db";
/* A serverless build with a file database would migrate a file nobody serves
   from. Fail here, with the fix, rather than at the first request. */
if (process.env.VERCEL && url.startsWith("file:")) {
  console.error(
    "[migrate] No remote database configured. On Vercel add the Turso integration (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN) or set DATABASE_URL and DATABASE_AUTH_TOKEN in the project's environment variables, then redeploy.",
  );
  process.exit(1);
}
if (url.startsWith("file:")) mkdirSync(url.slice(5).replace(/\/[^/]*$/, "") || ".", { recursive: true });

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
console.log(`[migrate] database up to date (${url.startsWith("file:") ? url : "remote"})`);
client.close();
