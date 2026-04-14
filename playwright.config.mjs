import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const serverPort = 3100;
const catalogCachePath = path.resolve(repoRoot, ".tmp/playwright-catalog.json");
const roomsPersistencePath = path.resolve(repoRoot, ".tmp/playwright-rooms.json");

export default defineConfig({
  testDir: "./e2e",
  timeout: 20_000,
  expect: {
    timeout: 4_000
  },
  use: {
    baseURL: `http://127.0.0.1:${serverPort}`,
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node --import tsx server/src/index.ts",
    url: `http://127.0.0.1:${serverPort}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT: String(serverPort),
      HOST: "127.0.0.1",
      CATALOG_CACHE_PATH: catalogCachePath,
      ROOMS_PERSISTENCE_PATH: roomsPersistencePath,
      CATALOG_REFRESH_INTERVAL_MS: "0"
    }
  }
});
