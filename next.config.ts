import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Standalone output is what the Dockerfile copies; it is harmless on Vercel. */
  output: "standalone",
  /* Runtime data (the local database, uploads) must never ride along in the
     traced server output. */
  outputFileTracingExcludes: { "*": ["./data/**"] },
  /* Next writes AGENTS.md / CLAUDE.md on dev start; the repo keeps its own. */
  agentRules: false,
};

export default nextConfig;
