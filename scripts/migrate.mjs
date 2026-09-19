import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";

import { resolveDatabaseEnv } from "./db-env.mjs";

const { url, authToken, source } = resolveDatabaseEnv();
/* A serverless build with a file database would migrate a file nobody serves
   from. Fail here, with the fix, rather than at the first request. */
if (process.env.VERCEL && url.startsWith("file:")) {
  console.error(
    "[migrate] No remote database configured. On Vercel connect the Turso integration to this project (any variable prefix works) or set DATABASE_URL and DATABASE_AUTH_TOKEN in the project's environment variables, then redeploy.",
  );
  process.exit(1);
}
if (url.startsWith("file:")) mkdirSync(url.slice(5).replace(/\/[^/]*$/, "") || ".", { recursive: true });

const client = createClient({ url, authToken });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
console.log(`[migrate] database up to date (${url.startsWith("file:") ? url : `remote via ${source}`})`);
client.close();
