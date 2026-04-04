import { spriteBase } from "./app-config.js";

export function createPokemonBootstrap(deps) {
  const {
    state,
    pokedex,
    normalizeName,
    prettifyName,
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
    inputEl,
    retryBtn,
    onCatalogHydrated
  } = deps;

  async function loadPokemon() {
    setInputStatus("Loading Pokemon list...");
    if (retryBtn) retryBtn.hidden = true;
    try {
      const generationPromise = loadGenerations(pokedex);
      const typePromise = loadTypes(pokedex);
      const speciesData = await pokedex.getPokemonSpeciesList({ limit: 2000 });
      const speciesEntries = speciesData && speciesData.results ? speciesData.results : [];
      const names = [];
      state.meta = new Map();
      state.generationIndex = new Map();
      state.typeIndex = new Map();
      state.legendaryIndex = new Set();
      state.legendaryIndexReady = false;
      state.weeklyChallengeCatalog = [];
      state.weeklyChallengeCatalogReady = false;
      state.guessIndex.clear();
      state.namesByLang.clear();

      speciesEntries.forEach((entry) => {
        const normalized = normalizeName(entry.name);
        if (!normalized) return;
        names.push(normalized);
        const label = prettifyName(entry.name);
        let sprite = "";
        if (entry.url) {
          const match = entry.url.match(/\/pokemon-species\/(\d+)\//);
          if (match) {
            sprite = `${spriteBase}${match[1]}.png`;
            entry.cryId = match[1];
          }
        }
        state.meta.set(normalized, {
          label,
          sprite,
          cryId: entry.cryId || "",
          dexId: entry.cryId || "",
          generation: "Unknown",
          types: [],
          normalized
        });
      });

      const speciesByName = new Map();
      speciesEntries.forEach((entry) => {
        const normalized = normalizeName(entry.name);
        if (normalized) speciesByName.set(normalized, entry.url);
      });

      const detailUrls = names
        .map((canonical) => speciesByName.get(canonical))
        .filter(Boolean);

      state.allNames = names;
      initThemes();
      restoreSettings();
      restoreState();
      applyFilters();
      scheduleLocalizedNameHydration({
        state,
        pokedex,
        detailUrls,
        fetchResourcesInBatches,
        onComplete: () => {
          if (typeof onCatalogHydrated === "function") {
            onCatalogHydrated();
          }
        }
      });
      scheduleFilterMetadataHydration(generationPromise, typePromise);
      await restoreProgressFromHash();
      syncWeeklyChallengeState();
      if (!inputEl || !inputEl.disabled) {
        setInputStatus("");
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
