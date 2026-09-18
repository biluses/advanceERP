/** Runs once when the Node server starts: the database is brought up to the
    current schema before the first request, so a fresh container or a
    freshly cloned checkout needs no separate migrate step. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  /* On Vercel the build step migrates (see "vercel-build" in package.json):
     many cold-starting functions must not race each other on the schema. */
  if (process.env.VERCEL) return;
  const { mkdir } = await import("node:fs/promises");
  const url = process.env.DATABASE_URL?.trim() || "file:./data/vitrina.db";
  if (url.startsWith("file:")) {
    const dir = url.slice(5).replace(/\/[^/]*$/, "");
    if (dir && dir !== url.slice(5)) await mkdir(dir, { recursive: true });
  }
  const { runMigrations } = await import("@/db/migrate");
  await runMigrations();
  console.info("[vitrina] database ready");
}
