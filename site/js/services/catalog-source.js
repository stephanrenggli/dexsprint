import { normalizeName, prettifyName } from "../domain/text.js";

export async function fetchResourcesInBatches(pokedex, urls, batchSize = 40) {
  const output = [];
  let hadFailures = false;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    if (!batch.length) continue;
    try {
      const batchResult = await pokedex.resource(batch);
      if (Array.isArray(batchResult)) {
        output.push(...batchResult);
      } else if (batchResult) {
        output.push(batchResult);
      }
    } catch (error) {
      hadFailures = true;
      console.warn("Failed to load a PokéAPI resource batch", error);
    }
  }
  output.hadFailures = hadFailures;
  return output;
}

async function loadCatalogGroup(pokedex, {
  listLoader,
  listLimit,
  filterItems = (items) => items,
  buildEntry
}) {
  const indexMap = new Map();
  try {
    const data = await listLoader({ limit: listLimit });
    const items = filterItems(data && data.results ? data.results : []);
    const details = await fetchResourcesInBatches(pokedex, items.map((item) => item.url));
    const hadFailures = Boolean(details.hadFailures);
    const entries = (details || []).map((detail) => buildEntry(detail, indexMap));
    return { entries: entries.filter(Boolean), indexMap, hadFailures };
  } catch (error) {
    return { entries: [], indexMap, hadFailures: true, error };
  }
}

export async function loadGenerations(pokedex) {
  const result = await loadCatalogGroup(pokedex, {
    listLoader: (options) => pokedex.getGenerationsList(options),
    listLimit: 40,
    buildEntry: (genData, generationMap) => {
      if (!genData) return null;
      const species = genData.pokemon_species || [];
      const names = species.map((s) => normalizeName(s.name)).filter(Boolean);
      names.forEach((name) => generationMap.set(name, genData.name));
      return { name: genData.name, label: prettifyName(genData.name), names };
    }
  });
  if (result.hadFailures || result.error) {
    console.warn("Generation metadata failed to load", result.error || "partial failure");
  }
  return {
    entries: result.entries,
    generationMap: result.indexMap,
    hadFailures: result.hadFailures
  };
}

export async function loadTypes(pokedex) {
  const result = await loadCatalogGroup(pokedex, {
    listLoader: (options) => pokedex.getTypesList(options),
    listLimit: 40,
    filterItems: (items) =>
      items.filter((type) => type.name !== "unknown" && type.name !== "shadow"),
    buildEntry: (typeData, typeMap) => {
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
    }
  });
  if (result.hadFailures || result.error) {
    console.warn("Type metadata failed to load", result.error || "partial failure");
  }
  return {
    entries: result.entries,
    typeMap: result.indexMap,
    hadFailures: result.hadFailures
  };
}
