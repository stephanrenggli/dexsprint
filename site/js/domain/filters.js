import { formatGenerationLabel, generationOrder, normalizeName, prettifyName } from "./text.js";

export function summarizeFilterSelection(values, formatter) {
  if (!values || !values.length) return "All";
  const labels = values.map(formatter).filter(Boolean);
  if (!labels.length) return "All";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels[0]}, ${labels[1]} +${labels.length - 2}`;
}

export function filterNamesBySelectedIndex(names, selectedValues, indexMap) {
  if (!selectedValues.length) return names;
  const union = new Set();
  selectedValues.forEach((value) => {
    const entrySet = indexMap.get(value) || new Set();
    entrySet.forEach((name) => union.add(name));
  });
  return names.filter((name) => union.has(name));
}

export function getGenerationSlugByInput(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  const slugMap = {
    1: "generation-i",
    2: "generation-ii",
    3: "generation-iii",
    4: "generation-iv",
    5: "generation-v",
    6: "generation-vi",
    7: "generation-vii",
    8: "generation-viii",
    9: "generation-ix"
  };

  if (/^\d+$/.test(raw) && slugMap[Number(raw)]) {
    return slugMap[Number(raw)];
  }

  const aliases = {
    "generation-i": ["generation-i", "kanto", "gen-i", "gen1", "gen-1"],
    "generation-ii": ["generation-ii", "johto", "gen-ii", "gen2", "gen-2"],
    "generation-iii": ["generation-iii", "hoenn", "gen-iii", "gen3", "gen-3"],
    "generation-iv": ["generation-iv", "sinnoh", "gen-iv", "gen4", "gen-4"],
    "generation-v": ["generation-v", "unova", "gen-v", "gen5", "gen-5"],
    "generation-vi": ["generation-vi", "kalos", "gen-vi", "gen6", "gen-6"],
    "generation-vii": ["generation-vii", "alola", "gen-vii", "gen7", "gen-7"],
    "generation-viii": ["generation-viii", "galar", "gen-viii", "gen8", "gen-8"],
    "generation-ix": ["generation-ix", "paldea", "gen-ix", "gen9", "gen-9"]
  };

  for (const [slug, keys] of Object.entries(aliases)) {
    if (keys.some((entry) => raw === entry || raw === normalizeName(entry))) {
      return slug;
    }
    const label = formatGenerationLabel(slug).toLowerCase();
    if (raw === label || raw === normalizeName(label)) {
      return slug;
    }
  }

  return "";
}

export function getTypeSlugByInput(value, typeIndex) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const normalized = raw.replace(/\s+/g, "");
  const byKey = [...typeIndex.keys()].find((key) => {
    const label = prettifyName(key).toLowerCase();
    return raw === key.toLowerCase() || raw === label || normalized === key.toLowerCase();
  });
  return byKey || "";
}
