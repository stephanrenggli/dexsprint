import assert from "node:assert/strict";
import test from "node:test";

import { loadCatalog } from "./catalog.js";

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response;
}

test("loadCatalog skips failed species detail requests", async () => {
  const originalFetch = globalThis.fetch;
  const speciesList = {
    results: [
      { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon-species/1/" },
      { name: "charmander", url: "https://pokeapi.co/api/v2/pokemon-species/4/" }
    ]
  };
  const bulbasaurDetail = {
    name: "bulbasaur",
    names: [{ name: "Bulbasaur", language: { name: "en" } }],
    generation: { name: "generation-i" }
  };

  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    if (url.endsWith("/pokemon-species?limit=2000")) {
      return createJsonResponse(speciesList);
    }
    if (url.endsWith("/pokemon-species/1/")) {
      return createJsonResponse(bulbasaurDetail);
    }
    if (url.endsWith("/pokemon-species/4/")) {
      return createJsonResponse({}, 500);
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  }) as typeof fetch;

  try {
    const catalog = await loadCatalog();

    assert.equal(catalog.entries.length, 2);
    assert.equal(catalog.entries[0]?.label, "Bulbasaur");
    assert.equal(catalog.entries[0]?.generation, "generation-i");
    assert.equal(catalog.entries[1]?.label, "charmander");
    assert.equal(catalog.entries[1]?.generation, "unknown");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
