import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";

const url = process.env.DATABASE_URL?.trim() || process.env.TURSO_DATABASE_URL?.trim() || "file:./data/vitrina.db";
if (url.startsWith("file:")) mkdirSync(url.slice(5).replace(/\/[^/]*$/, "") || ".", { recursive: true });

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
console.log(`[migrate] database up to date (${url.startsWith("file:") ? url : "remote"})`);
client.close();
