import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const serverPort = 3100;
const catalogCachePath = path.resolve(repoRoot, ".tmp/playwright-catalog.json");
const roomsPersistencePath = path.resolve(repoRoot, ".tmp/playwright-rooms.json");
const catalogSnapshot = {
  version: "e2e",
  generatedAt: "2026-04-14T00:00:00.000Z",
  entries: [
    {
      canonical: "bulbasaur",
      label: "Bulbasaur",
      guesses: ["Bisasam", "Bulbasaur"],
      dexId: 1,
      generation: "generation-i",
      types: ["grass", "poison"]
    },
    {
      canonical: "charmander",
      label: "Charmander",
      guesses: ["Glumanda", "Charmander"],
      dexId: 4,
      generation: "generation-i",
      types: ["fire"]
    }
  ]
};

mkdirSync(path.dirname(catalogCachePath), { recursive: true });
writeFileSync(`${catalogCachePath}`, `${JSON.stringify(catalogSnapshot, null, 2)}\n`, "utf8");

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
    reuseExistingServer: false,
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
