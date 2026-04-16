import { spriteBase } from "../core/app-config.js";
import { formatGenerationLabel, prettifyName } from "../domain/text.js";
import { normalizeName } from "../domain/text.js";

const POKEAPI_SPECIES_BASE = "https://pokeapi.co/api/v2/pokemon-species/";

export async function fetchServerCatalogSnapshot() {
  const response = await fetch("/api/catalog", { cache: "no-store" });
  if (!response.ok) {
    const error = new Error(`Catalog snapshot request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const snapshot = await response.json();
  if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.entries)) {
    throw new Error("Invalid catalog snapshot response");
  }

  return snapshot;
}

export function seedCatalogFromSnapshot(state, snapshot) {
  const names = [];
  const detailUrls = [];

  (snapshot?.entries || []).forEach((entry) => {
    const canonical = normalizeName(entry?.canonical || "");
    if (!canonical) return;

    const dexId = Number.parseInt(String(entry.dexId || ""), 10);
    if (!Number.isFinite(dexId) || dexId <= 0) return;

    names.push(canonical);
    detailUrls.push(`${POKEAPI_SPECIES_BASE}${dexId}/`);

    state.meta.set(canonical, {
      label: entry.label || prettifyName(canonical),
      sprite: `${spriteBase}${dexId}.png`,
      cryId: String(dexId),
      dexId: String(dexId),
      generation: entry.generation ? formatGenerationLabel(entry.generation) : "Unknown",
      types: Array.isArray(entry.types) ? [...entry.types].map(prettifyName).sort() : [],
      normalized: canonical
    });
  });

  return { names, detailUrls };
}
