import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { CatalogStore } from "./catalog-store.js";

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response;
}

test("CatalogStore writes and reuses a cached snapshot", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "dexsprint-catalog-"));
  const cachePath = path.join(cacheDir, "catalog.json");
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    if (url.endsWith("/pokemon-species?limit=2000")) {
      return createJsonResponse({
        results: [
          { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon-species/1/" }
        ]
      });
    }
    if (url.endsWith("/pokemon-species/1/")) {
      return createJsonResponse({
        name: "bulbasaur",
        names: [{ name: "Bulbasaur", language: { name: "en" } }],
        generation: { name: "generation-i" }
      });
    }
    if (url.endsWith("/type?limit=40")) {
      return createJsonResponse({ results: [] });
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  }) as typeof fetch;

  try {
    const store = new CatalogStore({ cachePath });
    const firstCatalog = await store.getCatalog();
    const written = JSON.parse(await readFile(cachePath, "utf8")) as {
      entries?: unknown[];
      guessIndex?: unknown;
    };

    assert.equal(firstCatalog.entries[0]?.canonical, "bulbasaur");
    assert.equal(firstCatalog.guessIndex.exact.get("bulbasaur"), "bulbasaur");
    assert.equal(Array.isArray(written.entries), true);
    assert.equal(written.guessIndex, undefined);

    globalThis.fetch = (async () => {
      throw new Error("network unavailable");
    }) as typeof fetch;

    const cachedStore = new CatalogStore({ cachePath });
    const cachedCatalog = await cachedStore.getCatalog();

    assert.equal(cachedCatalog.entries[0]?.canonical, "bulbasaur");
    assert.equal(cachedCatalog.guessIndex.exact.get("bulbasaur"), "bulbasaur");
  } finally {
    globalThis.fetch = originalFetch;
    await rm(cacheDir, { recursive: true, force: true });
  }
});
