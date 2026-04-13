import { spriteBase } from "./app-config.js";
import {
  fetchServerCatalogSnapshot,
  seedCatalogFromSnapshot
} from "../services/catalog-snapshot.js";

export function createPokemonBootstrap(deps) {
  const {
    state,
    pokedex,
    normalizeName,
    initThemes,
    restoreSettings,
    restoreState,
    applyFilters,
    scheduleLocalizedNameHydration,
    fetchResourcesInBatches,
    loadGenerations,
    loadTypes,
    scheduleFilterMetadataHydration,
    restoreProgressFromHash,
    syncWeeklyChallengeState,
    setInputStatus,
    clearInputStatus,
    inputEl,
    retryBtn,
    onCatalogHydrated,
    onLocalizedNameHydrationWarning
  } = deps;

  function resetCatalogState() {
    state.meta = new Map();
    state.generationIndex = new Map();
    state.typeIndex = new Map();
    state.legendaryIndex = new Set();
    state.legendaryIndexReady = false;
    state.weeklyChallengeCatalog = [];
    state.weeklyChallengeCatalogReady = false;
    state.guessIndex.clear();
    state.namesByLang.clear();
  }

  function seedCatalogFromSpeciesEntries(speciesEntries) {
    const names = [];
    const speciesByName = new Map();

    speciesEntries.forEach((entry) => {
      const normalized = normalizeName(entry.name);
      if (!normalized) return;
      names.push(normalized);
      speciesByName.set(normalized, entry.url || "");

      let sprite = "";
      if (entry.url) {
        const match = entry.url.match(/\/pokemon-species\/(\d+)\//);
        if (match) {
          sprite = `${spriteBase}${match[1]}.png`;
          entry.cryId = match[1];
        }
      }

      state.meta.set(normalized, {
        label: entry.name,
        sprite,
        cryId: entry.cryId || "",
        dexId: entry.cryId || "",
        generation: "Unknown",
        types: [],
        normalized
      });
    });

    return {
      names,
      detailUrls: names.map((canonical) => speciesByName.get(canonical)).filter(Boolean)
    };
  }

  async function tryLoadServerCatalogSnapshot() {
    try {
      const snapshot = await fetchServerCatalogSnapshot();
      if (!snapshot?.entries?.length) return null;
      return snapshot;
    } catch (error) {
      console.warn("Server catalog snapshot failed to load", error);
      return null;
    }
  }

  function applyInitialCatalogState() {
    initThemes();
    restoreSettings();
    restoreState();
    applyFilters();
  }

  function scheduleCatalogHydration(detailUrls, generationPromise, typePromise) {
    scheduleLocalizedNameHydration({
      state,
      pokedex,
      detailUrls,
      fetchResourcesInBatches,
      onComplete: () => {
        if (typeof onCatalogHydrated === "function") {
          onCatalogHydrated();
        }
      },
      onWarning: () => {
        if (typeof onLocalizedNameHydrationWarning === "function") {
          onLocalizedNameHydrationWarning();
        }
      },
      onError: () => {
        if (typeof onLocalizedNameHydrationWarning === "function") {
          onLocalizedNameHydrationWarning();
        }
      }
    });
    scheduleFilterMetadataHydration(generationPromise, typePromise);
  }

  async function loadPokemon() {
    setInputStatus("Loading Pokemon list...");
    if (retryBtn) retryBtn.hidden = true;
    try {
      const generationPromise = loadGenerations(pokedex);
      const typePromise = loadTypes(pokedex);
      resetCatalogState();
      const serverCatalog = await tryLoadServerCatalogSnapshot();
      let seededCatalog = null;
      if (serverCatalog) {
        seededCatalog = seedCatalogFromSnapshot(state, serverCatalog);
      }
      if (!seededCatalog?.names?.length) {
        const speciesData = await pokedex.getPokemonSpeciesList({ limit: 2000 });
        const speciesEntries = speciesData && speciesData.results ? speciesData.results : [];
        seededCatalog = seedCatalogFromSpeciesEntries(speciesEntries);
      }

      const { names, detailUrls } = seededCatalog;
      state.allNames = names;
      applyInitialCatalogState();
      scheduleCatalogHydration(detailUrls, generationPromise, typePromise);
      await restoreProgressFromHash();
      syncWeeklyChallengeState();
      if (!inputEl || !inputEl.disabled) {
        clearInputStatus?.();
      }
    } catch (err) {
      console.error("loadPokemon failed", err);
      const message =
        err && err.name === "AbortError"
          ? "PokeAPI is taking too long. Click retry."
          : "Could not load PokeAPI. Check your connection.";
      setInputStatus(message);
      if (retryBtn) retryBtn.hidden = false;
    }
  }

  return { loadPokemon };
}
