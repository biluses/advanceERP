/* Serves the production build the way the Dockerfile does: the standalone
   server, with the static assets and public folder laid beside it. Next
   leaves that copy to the deployer; this does it once and starts. */
import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const standalone = resolve(root, ".next/standalone");
if (!existsSync(resolve(standalone, "server.js"))) {
  console.error("[start] no standalone build found — run `pnpm build` first");
  process.exit(1);
}
cpSync(resolve(root, ".next/static"), resolve(standalone, ".next/static"), { recursive: true });
cpSync(resolve(root, "public"), resolve(standalone, "public"), { recursive: true });
cpSync(resolve(root, "drizzle"), resolve(standalone, "drizzle"), { recursive: true });

const child = spawn(process.execPath, ["server.js"], { cwd: standalone, stdio: "inherit", env: process.env });
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
