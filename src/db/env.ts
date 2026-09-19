/** Finds the database the environment describes, whatever the integration
    called it. Order: DATABASE_URL, TURSO_DATABASE_URL, then any variable
    ending in _URL whose value is a libsql/Turso URL — the Vercel marketplace
    lets the prefix be chosen, so the name is not fixed. The token is the
    sibling with the same prefix ending in _AUTH_TOKEN or _TOKEN. Mirrors
    scripts/db-env.mjs. */
export type DatabaseEnv = { url: string; authToken?: string; source: string };

/* A libsql URL, or Turso over HTTPS. A plain https URL is somebody else's. */
const REMOTE = /^(libsql:\/\/|wss?:\/\/|https?:\/\/[^/]*turso\.io)/;

export function resolveDatabaseEnv(env: Record<string, string | undefined> = process.env): DatabaseEnv {
  const pick = (urlKey: string, tokenKeys: string[]): DatabaseEnv | null => {
    const url = env[urlKey]?.trim();
    if (!url) return null;
    const authToken = tokenKeys.map((key) => env[key]?.trim()).find(Boolean);
    return { url, authToken: authToken || undefined, source: urlKey };
  };
  const direct =
    pick("DATABASE_URL", ["DATABASE_AUTH_TOKEN", "DATABASE_TOKEN"]) ??
    pick("TURSO_DATABASE_URL", ["TURSO_AUTH_TOKEN", "TURSO_TOKEN"]);
  if (direct) return direct;
  for (const key of Object.keys(env).sort()) {
    const value = env[key];
    if (!key.endsWith("_URL") || !value || !REMOTE.test(value.trim())) continue;
    const prefix = key.slice(0, -"_URL".length).replace(/_DATABASE$/, "");
    const found = pick(key, [`${prefix}_DATABASE_AUTH_TOKEN`, `${prefix}_AUTH_TOKEN`, `${prefix}_DATABASE_TOKEN`, `${prefix}_TOKEN`]);
    if (found) return found;
  }
  return { url: "file:./data/vitrina.db", source: "default" };
}

export function isFileDatabase(env: Record<string, string | undefined> = process.env): boolean {
  return resolveDatabaseEnv(env).url.startsWith("file:");
}
