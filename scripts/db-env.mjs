/* Finds the database the environment describes, whatever the integration
   called it. Order: DATABASE_URL, TURSO_DATABASE_URL, then any variable
   ending in _URL whose value is a libsql/Turso URL (the Vercel marketplace
   lets the prefix be chosen, so the name is not fixed). The token is the
   sibling with the same prefix ending in _AUTH_TOKEN or _TOKEN. Shared by
   the scripts; src/db/env.ts is the same logic for the app. */
export function resolveDatabaseEnv(env = process.env) {
  const isRemote = (value) => typeof value === "string" && /^(libsql|https?|wss?):\/\//.test(value.trim());
  const pick = (urlKey, tokenKeys) => {
    const url = env[urlKey]?.trim();
    if (!url) return null;
    const token = tokenKeys.map((key) => env[key]?.trim()).find(Boolean);
    return { url, authToken: token || undefined, source: urlKey };
  };
  const direct = pick("DATABASE_URL", ["DATABASE_AUTH_TOKEN", "DATABASE_TOKEN"]) ?? pick("TURSO_DATABASE_URL", ["TURSO_AUTH_TOKEN", "TURSO_TOKEN"]);
  if (direct) return direct;
  for (const key of Object.keys(env).sort()) {
    if (!key.endsWith("_URL") || !isRemote(env[key])) continue;
    const prefix = key.slice(0, -"_URL".length).replace(/_DATABASE$/, "");
    const found = pick(key, [`${prefix}_DATABASE_AUTH_TOKEN`, `${prefix}_AUTH_TOKEN`, `${prefix}_DATABASE_TOKEN`, `${prefix}_TOKEN`]);
    if (found) return found;
  }
  return { url: "file:./data/vitrina.db", authToken: undefined, source: "default" };
}
