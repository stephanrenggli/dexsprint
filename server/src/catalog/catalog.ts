import { buildGuessIndex, type GuessEntry, type GuessIndex } from "../../../shared/src/guess.js";
import { normalizeName } from "../../../shared/src/text.js";
import type { RoomSettings } from "../../../shared/src/protocol.js";

interface PokeApiListResponse {
  results?: Array<{ name: string; url: string }>;
}

interface PokeApiSpeciesDetail {
  name?: string;
  names?: Array<{ name: string; language?: { name?: string } }>;
  generation?: { name?: string };
}

export interface CatalogEntry extends GuessEntry {
  dexId: number;
  generation: string;
  types: string[];
}

export interface CatalogSnapshot {
  version: string;
  generatedAt: string;
  entries: CatalogEntry[];
  guessIndex: GuessIndex;
}

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const SUPPORTED_LANGUAGES = new Set(["en", "de", "es"]);

function getSpeciesDisplayName(detail: PokeApiSpeciesDetail | undefined, fallback: string): string {
  const englishName = detail?.names?.find((entry) => entry.language?.name === "en")?.name;
  return englishName || fallback;
}

function dexIdFromSpeciesUrl(url: string): number {
  const match = url.match(/\/pokemon-species\/(\d+)\/?$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PokeAPI request failed: ${response.status} ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchSpeciesDetails(urls: string[], batchSize = 40): Promise<PokeApiSpeciesDetail[]> {
  const details: PokeApiSpeciesDetail[] = [];
  for (let index = 0; index < urls.length; index += batchSize) {
    const batch = urls.slice(index, index + batchSize);
    const result = await Promise.all(batch.map((url) => fetchJson<PokeApiSpeciesDetail>(url)));
    details.push(...result);
  }
  return details;
}

export async function loadCatalog(): Promise<CatalogSnapshot> {
  const list = await fetchJson<PokeApiListResponse>(`${POKEAPI_BASE}/pokemon-species?limit=2000`);
  const species = list.results || [];
  const detailsByName = new Map<string, PokeApiSpeciesDetail>();

  const details = await fetchSpeciesDetails(species.map((entry) => entry.url));
  details.forEach((detail) => {
    if (detail.name) detailsByName.set(normalizeName(detail.name), detail);
  });

  const entries = species
    .map((entry) => {
      const canonical = normalizeName(entry.name);
      const detail = detailsByName.get(canonical);
      const guesses = (detail?.names || [])
        .filter((nameEntry) => SUPPORTED_LANGUAGES.has(nameEntry.language?.name || ""))
        .map((nameEntry) => nameEntry.name)
        .filter(Boolean);

      return {
        canonical,
        label: getSpeciesDisplayName(detail, entry.name),
        guesses,
        dexId: dexIdFromSpeciesUrl(entry.url),
        generation: detail?.generation?.name || "unknown",
        types: []
      };
    })
    .filter((entry) => entry.canonical && entry.dexId > 0);

  const generatedAt = new Date().toISOString();
  const version = `${entries.length}:${entries[0]?.dexId || 0}:${entries.at(-1)?.dexId || 0}`;

  return {
    version,
    generatedAt,
    entries,
    guessIndex: buildGuessIndex(entries)
  };
}

export function filterCatalogEntries(catalog: CatalogSnapshot, settings: RoomSettings): CatalogEntry[] {
  let entries = catalog.entries;

  if (settings.generations.length) {
    const generations = new Set(settings.generations);
    entries = entries.filter((entry) => generations.has(entry.generation));
  }

  if (settings.types.length) {
    const types = new Set(settings.types);
    entries = entries.filter((entry) => entry.types.some((type) => types.has(type)));
  }

  return entries;
}
