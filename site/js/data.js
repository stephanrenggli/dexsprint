import { normalizeName, prettifyName } from "./text.js";

export async function fetchResourcesInBatches(pokedex, urls, batchSize = 40) {
  const output = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    if (!batch.length) continue;
    const batchResult = await pokedex.resource(batch);
    if (Array.isArray(batchResult)) {
      output.push(...batchResult);
    } else if (batchResult) {
      output.push(batchResult);
    }
  }
  return output;
}

export async function loadGenerations(pokedex) {
  const data = await pokedex.getGenerationsList({ limit: 40 });
  const gens = data && data.results ? data.results : [];
  const generationMap = new Map();
  const genDetails = await pokedex.resource(gens.map((gen) => gen.url));
  const entries = (genDetails || []).map((genData) => {
    if (!genData) return null;
    const species = genData.pokemon_species || [];
    const names = species.map((s) => normalizeName(s.name)).filter(Boolean);
    names.forEach((name) => generationMap.set(name, genData.name));
    return { name: genData.name, label: prettifyName(genData.name), names };
  });
  return { entries: entries.filter(Boolean), generationMap };
}

export async function loadTypes(pokedex) {
  const data = await pokedex.getTypesList({ limit: 40 });
  const types = (data && data.results ? data.results : []).filter(
    (type) => type.name !== "unknown" && type.name !== "shadow"
  );
  const typeMap = new Map();
  const typeDetails = await pokedex.resource(types.map((type) => type.url));
  const entries = (typeDetails || []).map((typeData) => {
    if (!typeData) return null;
    const pokemon = typeData.pokemon || [];
    const names = pokemon
      .map((p) => normalizeName(p.pokemon.name))
      .filter(Boolean);
    names.forEach((name) => {
      if (!typeMap.has(name)) typeMap.set(name, new Set());
      typeMap.get(name).add(typeData.name);
    });
    return {
      name: typeData.name,
      label: prettifyName(typeData.name),
      names,
      id: typeData.id
    };
  });
  return { entries: entries.filter(Boolean), typeMap };
}

export async function loadSpeciesList(pokedex, slowPokedex) {
  try {
    return await pokedex.getPokemonSpeciesList({ limit: 2000 });
  } catch (error) {
    const isTimeout = error && (error.name === "AbortError" || /timeout/i.test(error.message || ""));
    if (!isTimeout) throw error;
    console.warn("Primary PokeAPI species load timed out, retrying with a longer timeout.");
    return slowPokedex.getPokemonSpeciesList({ limit: 2000 });
  }
}

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
    state.typeIndex.set(entry.name, new Set(entry.names.map(normalizeName)));
  });

  state.meta.forEach((entry, normalized) => {
    entry.generation = formatGenerationLabel(
      generationData.generationMap.get(normalized) || "Unknown"
    );
    entry.types = typeData.typeMap.has(normalized)
      ? [...typeData.typeMap.get(normalized)].sort().map(prettifyName)
      : [];
  });
}

export function hydrateLocalizedNames(state, speciesDetails) {
  speciesDetails.forEach((detail) => {
    if (!detail || !detail.name) return;
    const canonical = normalizeName(detail.name);
    if (!canonical) return;
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
  });
}

export function scheduleLocalizedNameHydration({
  state,
  pokedex,
  detailUrls,
  fetchResourcesInBatches
}) {
  if (!detailUrls.length) return;
  const hydrate = async () => {
    try {
      const speciesDetails = await fetchResourcesInBatches(pokedex, detailUrls, 40);
      hydrateLocalizedNames(state, speciesDetails);
    } catch (error) {
      console.warn("Localized name hydration failed", error);
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
