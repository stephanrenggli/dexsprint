import { normalizeName, prettifyName } from "../domain/text.js";

export async function fetchResourcesInBatches(pokedex, urls, batchSize = 40) {
  const output = [];
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
      console.warn("Failed to load a PokéAPI resource batch", error);
    }
  }
  return output;
}

export async function loadGenerations(pokedex) {
  const generationMap = new Map();
  try {
    const data = await pokedex.getGenerationsList({ limit: 40 });
    const gens = data && data.results ? data.results : [];
    const genDetails = await fetchResourcesInBatches(pokedex, gens.map((gen) => gen.url));
    const entries = (genDetails || []).map((genData) => {
      if (!genData) return null;
      const species = genData.pokemon_species || [];
      const names = species.map((s) => normalizeName(s.name)).filter(Boolean);
      names.forEach((name) => generationMap.set(name, genData.name));
      return { name: genData.name, label: prettifyName(genData.name), names };
    });
    return { entries: entries.filter(Boolean), generationMap };
  } catch (error) {
    console.warn("Generation metadata failed to load", error);
    return { entries: [], generationMap };
  }
}

export async function loadTypes(pokedex) {
  const typeMap = new Map();
  try {
    const data = await pokedex.getTypesList({ limit: 40 });
    const types = (data && data.results ? data.results : []).filter(
      (type) => type.name !== "unknown" && type.name !== "shadow"
    );
    const typeDetails = await fetchResourcesInBatches(pokedex, types.map((type) => type.url));
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
  } catch (error) {
    console.warn("Type metadata failed to load", error);
    return { entries: [], typeMap };
  }
}
