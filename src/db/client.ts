import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import { resolveDatabaseEnv } from "./env";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

/** One connection per process. Local development and single-node self-hosting
    use a file; Turso (or any libsql server) takes a URL and a token, under
    whatever names the integration chose (see ./env). */
function resolveUrl(): { url: string; authToken?: string } {
  const { url, authToken } = resolveDatabaseEnv();
  return { url, authToken };
}

declare global {
  var __vitrinaDb: { client: Client; db: Db } | undefined;
}

function connect(): { client: Client; db: Db } {
  const client = createClient(resolveUrl());
  return { client, db: drizzle(client, { schema }) };
}

/* Next's dev server re-evaluates modules on every edit; the handle is parked
   on globalThis so a session of edits does not leak a connection each. */
const handle = globalThis.__vitrinaDb ?? connect();
if (process.env.NODE_ENV !== "production") globalThis.__vitrinaDb = handle;

export const db: Db = handle.db;
export const dbClient: Client = handle.client;
export { schema };
