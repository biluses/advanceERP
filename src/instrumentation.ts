/** Runs once when the Node server starts. The work lives in a Node-only
    module loaded behind the runtime check, the way Next documents it, so
    the edge bundle never sees a Node import. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  /* On Vercel the build step migrates (see "vercel-build" in package.json):
     many cold-starting functions must not race each other on the schema. */
  if (process.env.VERCEL) return;
  const { migrateOnBoot } = await import("./instrumentation-node");
  await migrateOnBoot();
}
