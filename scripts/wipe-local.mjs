/* Resets the local environment to a clean slate. What goes:
     data/            the local database and uploads (DATA_DIR)
     .next/           the build output
     test-results/ playwright-report/   test artifacts
     node_modules/    only with --deps (then reinstalls)
   What stays: .env, source, git. Then the database is recreated by running
   the migrations, so `pnpm dev` starts on an empty studio.

     node scripts/wipe-local.mjs [--deps] [--keep-uploads] [--yes] [--dry-run]
*/
import { execSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";

import { resolveDatabaseEnv } from "./db-env.mjs";

const args = new Set(process.argv.slice(2));
const root = resolve(import.meta.dirname, "..");
const dataDir = resolve(root, process.env.DATA_DIR?.trim() || "./data");
const dryRun = args.has("--dry-run");

const remoteDb = !resolveDatabaseEnv().url.startsWith("file:");
if (remoteDb) {
  console.error("[wipe-local] DATABASE_URL points at a remote database. This script only resets local files; unset it or point it at a file: URL.");
  process.exit(1);
}

const targets = [];
if (args.has("--keep-uploads")) {
  for (const entry of existsSync(dataDir) ? readdirSync(dataDir, { withFileTypes: true }) : []) {
    if (entry.name !== "uploads") targets.push(resolve(dataDir, entry.name));
  }
} else {
  targets.push(dataDir);
}
targets.push(resolve(root, ".next"), resolve(root, "test-results"), resolve(root, "playwright-report"));
if (args.has("--deps")) targets.push(resolve(root, "node_modules"));

const present = targets.filter((path) => existsSync(path));
console.log("[wipe-local] will remove:");
for (const path of present) console.log(`  ${path.replace(`${root}/`, "")}`);
if (present.length === 0) console.log("  (nothing — already clean)");

if (dryRun) process.exit(0);
if (!args.has("--yes") && process.stdin.isTTY) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question("Type RESET to continue: ")).trim();
  rl.close();
  if (answer !== "RESET") {
    console.log("[wipe-local] aborted");
    process.exit(1);
  }
}

for (const path of present) rmSync(path, { recursive: true, force: true });

const run = (command) => execSync(command, { cwd: root, stdio: "inherit" });
if (args.has("--deps")) run("pnpm install --frozen-lockfile");
run("node scripts/migrate.mjs");
console.log("[wipe-local] done — `pnpm dev` starts on an empty studio");
