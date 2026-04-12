import { normalizeName, prettifyName } from "../domain/text.js";

export function applyMetadataIndexes(state, generationData, typeData, formatGenerationLabel) {
  state.generationIndex = new Map();
  state.typeIndex = new Map();

  generationData.entries.forEach((entry) => {
    state.generationIndex.set(
      entry.name,
      new Set(entry.names.map(normalizeName))
    );
  });

  typeData.entries.forEach((entry) => {
    state.typeIndex.set(
      entry.name,
      new Set(
        entry.names
          .map(normalizeName)
          .filter((name) => name && state.meta.has(name))
      )
    );
  });

  state.meta.forEach((entry, normalized) => {
    entry.generation = formatGenerationLabel(
      generationData.generationMap.get(normalized) || "Unknown"
    );
    entry.types = typeData.typeMap.has(normalized)
      ? [...typeData.typeMap.get(normalized)].sort().map(prettifyName)
      : [];
  });

  state.groupMetadataReady = true;
}

export function hydrateLocalizedNames(state, speciesDetails) {
  speciesDetails.forEach((detail) => {
    if (!detail || !detail.name) return;
    const canonical = normalizeName(detail.name);
    if (!canonical) return;
    const displayName =
      (detail.names || []).find((nameEntry) => nameEntry?.language?.name === "en")?.name || "";
    const namesByLang = new Map();
    (detail.names || []).forEach((nameEntry) => {
      if (!nameEntry || !nameEntry.language) return;
      if (nameEntry.language.name === "en") {
        namesByLang.set("en", nameEntry.name);
      }
      if (nameEntry.language.name === "de") {
        namesByLang.set("de", nameEntry.name);
      }
      if (nameEntry.language.name === "es") {
        namesByLang.set("es", nameEntry.name);
      }
    });
    state.namesByLang.set(canonical, namesByLang);
    if (displayName && state.meta.has(canonical)) {
      state.meta.get(canonical).label = displayName;
    }
  });
}

export function hydrateWeeklyChallengeIndex(state, speciesDetails) {
  const legendaryIndex = new Set();

  speciesDetails.forEach((detail) => {
    if (!detail || !detail.name) return;
    if (!detail.is_legendary) return;
    const canonical = normalizeName(detail.name);
    if (!canonical || !state.meta.has(canonical)) return;
    legendaryIndex.add(canonical);
  });

  state.legendaryIndex = legendaryIndex;
  state.legendaryIndexReady = true;
}

export function scheduleLocalizedNameHydration({
  state,
  pokedex,
  detailUrls,
  fetchResourcesInBatches,
  onComplete
}) {
  if (!detailUrls.length) {
    state.legendaryIndex = new Set();
    state.legendaryIndexReady = true;
    if (typeof onComplete === "function") {
      onComplete();
    }
    return;
  }
  const hydrate = async () => {
    try {
      const speciesDetails = await fetchResourcesInBatches(pokedex, detailUrls, 40);
      hydrateLocalizedNames(state, speciesDetails);
      hydrateWeeklyChallengeIndex(state, speciesDetails);
      if (typeof onComplete === "function") {
        onComplete();
      }
    } catch (error) {
      console.warn("Localized name hydration failed", error);
      state.legendaryIndex = new Set();
      state.legendaryIndexReady = true;
      if (typeof onComplete === "function") {
        onComplete();
      }
    }
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => {
      void hydrate();
    }, { timeout: 1500 });
    return;
  }

  window.setTimeout(() => {
    void hydrate();
  }, 0);
}
