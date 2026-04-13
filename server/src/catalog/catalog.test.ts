import assert from "node:assert/strict";
import test from "node:test";

import { loadCatalog } from "./catalog.js";
import { filterCatalogEntries } from "./catalog.js";
import { defaultRoomSettings } from "../../../shared/src/protocol.js";

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

test("loadCatalog includes type metadata for room filters", async () => {
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
  const charmanderDetail = {
    name: "charmander",
    names: [{ name: "Charmander", language: { name: "en" } }],
    generation: { name: "generation-i" }
  };
  const typeList = {
    results: [
      { name: "grass", url: "https://pokeapi.co/api/v2/type/12/" },
      { name: "fire", url: "https://pokeapi.co/api/v2/type/10/" },
      { name: "unknown", url: "https://pokeapi.co/api/v2/type/10001/" }
    ]
  };
  const typeDetails = {
    grass: {
      name: "grass",
      pokemon: [{ pokemon: { name: "bulbasaur" } }]
    },
    fire: {
      name: "fire",
      pokemon: [{ pokemon: { name: "charmander" } }]
    }
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
      return createJsonResponse(charmanderDetail);
    }
    if (url.endsWith("/type?limit=40")) {
      return createJsonResponse(typeList);
    }
    if (url.endsWith("/type/12/")) {
      return createJsonResponse(typeDetails.grass);
    }
    if (url.endsWith("/type/10/")) {
      return createJsonResponse(typeDetails.fire);
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  }) as typeof fetch;

  try {
    const catalog = await loadCatalog();
    const defaultSettings = defaultRoomSettings();
    const grassOnly = filterCatalogEntries(catalog, {
      ...defaultSettings,
      types: ["grass"]
    });

    assert.deepEqual(
      catalog.entries.map((entry) => ({ canonical: entry.canonical, types: entry.types })),
      [
        { canonical: "bulbasaur", types: ["grass"] },
        { canonical: "charmander", types: ["fire"] }
      ]
    );
    assert.deepEqual(grassOnly.map((entry) => entry.canonical), ["bulbasaur"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
