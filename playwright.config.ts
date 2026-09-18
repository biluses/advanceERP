import { defineConfig, devices } from "@playwright/test";

/* End-to-end against a production build and the mock platform. The
   database is a throwaway file so every run starts from a clean slate. */
const PORT = 3100;
const MOCK_PORT = 4110;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
    /* A machine with a Chromium already on disk can point at it instead of
       downloading the version this @playwright/test pins. */
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } } : {}),
  },
  webServer: [
    {
      command: `MOCK_PLATFORM_PORT=${MOCK_PORT} MOCK_PLATFORM_DELAY_MS=800 node scripts/mock-platform.mjs`,
      port: MOCK_PORT,
      reuseExistingServer: false,
    },
    {
      /* Migrate before the server listens: the boot migration also runs, but
         the first request must not race it. */
      command: `rm -rf data/e2e && node scripts/migrate.mjs && node scripts/start-standalone.mjs`,
      port: PORT,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: "production",
        PORT: String(PORT),
        HOSTNAME: "127.0.0.1",
        HF_API_BASE_URL: `http://localhost:${MOCK_PORT}`,
        APP_SECRET: "e2e-secret-not-for-production",
        APP_URL: `http://localhost:${PORT}`,
        PLATFORM_API_KEY: "e2e-id:e2e-secret",
        /* The standalone server runs from .next/standalone, so the paths are
           absolute to keep the throwaway database in the repo's data folder. */
        DATABASE_URL: `file:${process.cwd()}/data/e2e/vitrina.db`,
        DATA_DIR: `${process.cwd()}/data/e2e`,
        STORAGE_DRIVER: "local",
        NEXT_PUBLIC_STORAGE_DRIVER: "local",
      },
    },
  ],
});
