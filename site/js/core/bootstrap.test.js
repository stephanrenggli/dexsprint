import assert from "node:assert/strict";
import test from "node:test";

import { createPokemonBootstrap } from "./bootstrap.js";

function createResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

function createDeps(overrides = {}) {
  const calls = {
    applyFilters: 0,
    hydrate: [],
    hydrateComplete: 0,
    restoreProgress: 0,
    syncWeeklyChallenge: 0,
    setInputStatus: [],
    clearInputStatus: 0,
    speciesList: 0
  };

  const state = {
    meta: new Map(),
    generationIndex: new Map(),
    typeIndex: new Map(),
    legendaryIndex: new Set(),
    legendaryIndexReady: false,
    weeklyChallengeCatalog: [],
    weeklyChallengeCatalogReady: false,
    guessIndex: new Map(),
    namesByLang: new Map(),
    allNames: []
  };

  const deps = {
    state,
    pokedex: {
      async getPokemonSpeciesList() {
        calls.speciesList += 1;
        return {
          results: [
            {
              name: "bulbasaur",
              url: "https://pokeapi.co/api/v2/pokemon-species/1/"
            }
          ]
        };
      }
    },
    normalizeName: (value) => String(value || "").toLowerCase().trim(),
    initThemes() {},
    restoreSettings() {},
    restoreState() {},
    applyFilters() {
      calls.applyFilters += 1;
      return true;
    },
    scheduleLocalizedNameHydration({ detailUrls, onComplete }) {
      calls.hydrate.push(detailUrls);
      if (typeof onComplete === "function") {
        onComplete();
      }
    },
    fetchResourcesInBatches: async () => ({ items: [], hadFailures: false }),
    loadGenerations: async () => ({
      entries: [],
      generationMap: new Map(),
      hadFailures: false
    }),
    loadTypes: async () => ({
      entries: [],
      typeMap: new Map(),
      hadFailures: false
    }),
    scheduleFilterMetadataHydration() {},
    restoreProgressFromHash: async () => {
      calls.restoreProgress += 1;
    },
    syncWeeklyChallengeState() {
      calls.syncWeeklyChallenge += 1;
    },
    setInputStatus(message) {
      calls.setInputStatus.push(message);
    },
    clearInputStatus() {
      calls.clearInputStatus += 1;
    },
    inputEl: { disabled: false },
    retryBtn: { hidden: false },
    onCatalogHydrated() {
      calls.hydrateComplete += 1;
    },
    onLocalizedNameHydrationWarning() {},
    ...overrides
  };

  return { calls, deps, state };
}

test("createPokemonBootstrap seeds labels from the server catalog snapshot", async () => {
  const originalFetch = globalThis.fetch;
  const { calls, deps, state } = createDeps({
    pokedex: {
      async getPokemonSpeciesList() {
        throw new Error("species list should not be used when the catalog snapshot loads");
      }
    }
  });

  globalThis.fetch = (async (input) => {
    if (String(input) !== "/api/catalog") {
      throw new Error(`Unexpected fetch URL: ${String(input)}`);
    }
    return createResponse({
      version: "1",
      generatedAt: "2026-04-13T00:00:00.000Z",
      entries: [
        {
          canonical: "bulbasaur",
          label: "Bulbasaur",
          dexId: 1,
          generation: "generation-i",
          types: ["grass"]
        }
      ]
    });
  });

  try {
    const bootstrap = createPokemonBootstrap(deps);
    await bootstrap.loadPokemon();

    assert.deepEqual(state.allNames, ["bulbasaur"]);
    assert.equal(state.meta.get("bulbasaur")?.label, "Bulbasaur");
    assert.equal(state.meta.get("bulbasaur")?.dexId, "1");
    assert.equal(calls.speciesList, 0);
    assert.deepEqual(calls.hydrate, [["https://pokeapi.co/api/v2/pokemon-species/1/"]]);
    assert.equal(calls.hydrateComplete, 1);
    assert.equal(calls.applyFilters > 0, true);
    assert.equal(calls.restoreProgress, 1);
    assert.equal(calls.syncWeeklyChallenge, 1);
    assert.deepEqual(calls.setInputStatus, ["Loading Pokemon list..."]);
    assert.equal(calls.clearInputStatus, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createPokemonBootstrap falls back to the species list when the catalog snapshot fails", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const { calls, deps, state } = createDeps();
  const warnings = [];

  globalThis.fetch = (async () => {
    throw new Error("catalog unavailable");
  });
  console.warn = (...args) => {
    warnings.push(args);
  };

  try {
    const bootstrap = createPokemonBootstrap(deps);
    await bootstrap.loadPokemon();

    assert.deepEqual(state.allNames, ["bulbasaur"]);
    assert.equal(state.meta.get("bulbasaur")?.label, "bulbasaur");
    assert.equal(calls.speciesList, 1);
    assert.deepEqual(calls.hydrate, [["https://pokeapi.co/api/v2/pokemon-species/1/"]]);
    assert.equal(calls.hydrateComplete, 1);
    assert.equal(calls.clearInputStatus, 1);
    assert.equal(warnings.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});

test("createPokemonBootstrap quietly falls back when the server catalog endpoint is missing", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const { calls, deps, state } = createDeps();
  const warnings = [];

  globalThis.fetch = (async () => createResponse({ error: "NOT_FOUND" }, 404));
  console.warn = (...args) => {
    warnings.push(args);
  };

  try {
    const bootstrap = createPokemonBootstrap(deps);
    await bootstrap.loadPokemon();

    assert.deepEqual(state.allNames, ["bulbasaur"]);
    assert.equal(state.meta.get("bulbasaur")?.label, "bulbasaur");
    assert.equal(calls.speciesList, 1);
    assert.deepEqual(calls.hydrate, [["https://pokeapi.co/api/v2/pokemon-species/1/"]]);
    assert.equal(calls.hydrateComplete, 1);
    assert.equal(calls.clearInputStatus, 1);
    assert.equal(warnings.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});
