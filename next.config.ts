import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
  /* Standalone output is what the Dockerfile copies; it is harmless on Vercel. */
  output: "standalone",
  /* Runtime data (the local database, uploads) must never ride along in the
     traced server output. */
  outputFileTracingExcludes: { "*": ["./data/**"] },
  /* Next writes AGENTS.md / CLAUDE.md on dev start; the repo keeps its own. */
  agentRules: false,
};

export default nextConfig;
